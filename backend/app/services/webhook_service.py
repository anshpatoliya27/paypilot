import json
import hashlib
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import logging

from app.core.security import verify_razorpay_webhook_signature, generate_webhook_signature
from app.core.money import paise_to_rupees, format_inr
from app.models.webhook_event import WebhookEvent
from app.models.payment_request import PaymentRequest
from app.models.customer import Customer
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

class WebhookProcessingException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class WebhookService:
    @staticmethod
    async def process_webhook(
        db: AsyncSession,
        raw_body: bytes,
        signature_header: Optional[str],
        event_id_header: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process an incoming Razorpay webhook with HMAC-SHA256 signature verification,
        idempotency checking, atomic ledger reconciliation, and structured audit logging.
        """
        # 1. Cryptographic Signature Verification
        if not signature_header or not verify_razorpay_webhook_signature(raw_body, signature_header):
            logger.warning("Razorpay Webhook rejected: Invalid HMAC-SHA256 signature")
            raise WebhookProcessingException("Invalid or missing Razorpay webhook signature", status_code=400)

        # 2. Parse Raw Payload
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception as e:
            logger.error(f"Failed to parse webhook JSON payload: {e}")
            raise WebhookProcessingException("Malformed JSON payload in webhook body", status_code=400)

        event_type = payload.get("event")
        if not event_type:
            raise WebhookProcessingException("Missing 'event' field in webhook payload", status_code=400)

        # Determine official event ID (from header, payload root, or deterministic payload SHA256)
        event_id = (
            event_id_header or 
            payload.get("event_id") or 
            payload.get("id") or 
            f"evt_hash_{hashlib.sha256(raw_body).hexdigest()[:16]}"
        )

        logger.info(f"Received verified Razorpay webhook: event={event_type}, event_id={event_id}")

        # 3. Idempotency Check
        stmt = select(WebhookEvent).where(WebhookEvent.razorpay_event_id == event_id)
        existing_res = await db.execute(stmt)
        existing_event = existing_res.scalar_one_or_none()

        if existing_event:
            logger.info(f"Duplicate webhook event detected: {event_id}. Acknowledging without state mutation.")
            await AuditService.log_event(
                db=db,
                merchant_id="merchant_demo_apex_01",
                actor_type="RAZORPAY_WEBHOOK",
                action="WEBHOOK_DUPLICATE_IGNORED",
                title=f"Duplicate Webhook Acknowledged ({event_type})",
                details=f"Event ID {event_id} was already processed at {existing_event.processed_at}. No duplicate ledger changes applied.",
                metadata={"event_id": event_id, "event_type": event_type}
            )
            return {
                "status": "duplicate",
                "message": "Event already processed. Idempotency maintained.",
                "event_id": event_id,
                "event_type": event_type
            }

        # 4. Atomic Event Handling & Ledger Reconciliation
        reconciled_details = {}
        now = datetime.now(timezone.utc)
        merchant_id = "merchant_demo_apex_01"

        try:
            # -------------------------------------------------------------
            # Event A: payment_link.paid / payment.captured
            # -------------------------------------------------------------
            if event_type in ["payment_link.paid", "payment.captured"]:
                payload_data = payload.get("payload", {})
                payment_entity = payload_data.get("payment", {}).get("entity", {})
                link_entity = payload_data.get("payment_link", {}).get("entity", {})

                plink_id = link_entity.get("id") or payment_entity.get("notes", {}).get("payment_link_id")
                pay_id = payment_entity.get("id")
                amount_paise = int(payment_entity.get("amount", link_entity.get("amount", 0)))
                method = payment_entity.get("method", "upi")
                email = payment_entity.get("email") or link_entity.get("customer", {}).get("email")
                notes_customer_id = (
                    payment_entity.get("notes", {}).get("customer_id") or 
                    link_entity.get("notes", {}).get("customer_id")
                )

                # Match PaymentRequest by Razorpay Link ID or Payment ID
                pay_req = None
                if plink_id:
                    pr_stmt = select(PaymentRequest).where(PaymentRequest.razorpay_payment_link_id == plink_id)
                    pr_res = await db.execute(pr_stmt)
                    pay_req = pr_res.scalar_one_or_none()

                if not pay_req and pay_id:
                    pr_stmt = select(PaymentRequest).where(PaymentRequest.razorpay_payment_id == pay_id)
                    pr_res = await db.execute(pr_stmt)
                    pay_req = pr_res.scalar_one_or_none()

                # If still not found by ID, look up by amount for most recent pending request
                if not pay_req and amount_paise > 0:
                    pr_stmt = select(PaymentRequest).where(
                        and_(
                            PaymentRequest.amount_paise == amount_paise,
                            PaymentRequest.status.in_(["CREATED", "PENDING", "FAILED"])
                        )
                    ).order_by(PaymentRequest.created_at.desc())
                    pr_res = await db.execute(pr_stmt)
                    pay_req = pr_res.scalars().first()

                # Resolve customer
                customer = None
                if pay_req and pay_req.customer_id:
                    cust_stmt = select(Customer).where(Customer.id == pay_req.customer_id)
                    cust_res = await db.execute(cust_stmt)
                    customer = cust_res.scalar_one_or_none()

                if not customer and notes_customer_id:
                    cust_stmt = select(Customer).where(Customer.id == notes_customer_id)
                    cust_res = await db.execute(cust_stmt)
                    customer = cust_res.scalar_one_or_none()

                if not customer and email:
                    cust_stmt = select(Customer).where(Customer.email == email)
                    cust_res = await db.execute(cust_stmt)
                    customer = cust_res.scalar_one_or_none()

                if pay_req:
                    merchant_id = pay_req.merchant_id
                    pay_req.status = "PAID"
                    pay_req.razorpay_payment_id = pay_id or pay_req.razorpay_payment_id
                    pay_req.paid_at = now
                    pay_req.meta_data = {
                        **(pay_req.meta_data or {}),
                        "payment_method": method,
                        "webhook_reconciled_at": now.isoformat(),
                        "razorpay_event_id": event_id
                    }
                else:
                    # Create paid PaymentRequest record to track transaction in ledger
                    merchant_id = customer.merchant_id if customer else "merchant_demo_apex_01"
                    pay_req = PaymentRequest(
                        merchant_id=merchant_id,
                        customer_id=customer.id if customer else None,
                        razorpay_payment_link_id=plink_id,
                        razorpay_payment_id=pay_id,
                        amount_paise=amount_paise,
                        status="PAID",
                        description=link_entity.get("description") or f"Payment from {email or 'Customer'}",
                        paid_at=now,
                        meta_data={"source": "webhook_direct_capture", "razorpay_event_id": event_id}
                    )
                    db.add(pay_req)

                # Reconcile Customer Financial Ledger
                customer_name = "Valued Customer"
                if customer:
                    customer_name = customer.name
                    merchant_id = customer.merchant_id
                    prev_outstanding = customer.outstanding_balance_paise
                    customer.outstanding_balance_paise = max(0, customer.outstanding_balance_paise - amount_paise)
                    customer.lifetime_value_paise += amount_paise
                    customer.last_payment_date = now
                    customer.failed_payment_count = 0
                    
                    if customer.outstanding_balance_paise == 0:
                        customer.overdue_days = 0
                        customer.risk_category = "LOW"

                    reconciled_details["previous_outstanding_paise"] = prev_outstanding
                    reconciled_details["new_outstanding_paise"] = customer.outstanding_balance_paise

                # Audit Record
                formatted_amount = format_inr(amount_paise)
                await AuditService.log_event(
                    db=db,
                    merchant_id=merchant_id,
                    actor_type="RAZORPAY_WEBHOOK",
                    action="RAZORPAY_PAYMENT_CAPTURED",
                    title=f"Payment of {formatted_amount} captured ({customer_name})",
                    details=f"Payment ID: {pay_id} via {method.upper()}. Ledger balance successfully reconciled.",
                    metadata={
                        "payment_link_id": plink_id,
                        "payment_id": pay_id,
                        "amount_paise": amount_paise,
                        "event_id": event_id,
                        "method": method
                    }
                )
                reconciled_details["reconciled"] = True
                reconciled_details["payment_request_id"] = pay_req.id if pay_req else None

            # -------------------------------------------------------------
            # Event B: payment.failed
            # -------------------------------------------------------------
            elif event_type in ["payment.failed"]:
                payload_data = payload.get("payload", {})
                payment_entity = payload_data.get("payment", {}).get("entity", {})
                
                pay_id = payment_entity.get("id")
                amount_paise = int(payment_entity.get("amount", 0))
                error_code = payment_entity.get("error_code", "GENERIC_ERROR")
                error_desc = payment_entity.get("error_description", "Payment transaction failed")
                method = payment_entity.get("method", "unknown")
                plink_id = payment_entity.get("notes", {}).get("payment_link_id")
                email = payment_entity.get("email")

                pay_req = None
                if plink_id:
                    pr_stmt = select(PaymentRequest).where(PaymentRequest.razorpay_payment_link_id == plink_id)
                    pr_res = await db.execute(pr_stmt)
                    pay_req = pr_res.scalar_one_or_none()

                if not pay_req and amount_paise > 0:
                    pr_stmt = select(PaymentRequest).where(
                        PaymentRequest.amount_paise == amount_paise
                    ).order_by(PaymentRequest.created_at.desc())
                    pr_res = await db.execute(pr_stmt)
                    pay_req = pr_res.scalars().first()

                customer = None
                if pay_req and pay_req.customer_id:
                    cust_stmt = select(Customer).where(Customer.id == pay_req.customer_id)
                    cust_res = await db.execute(cust_stmt)
                    customer = cust_res.scalar_one_or_none()
                elif email:
                    cust_stmt = select(Customer).where(Customer.email == email)
                    cust_res = await db.execute(cust_stmt)
                    customer = cust_res.scalar_one_or_none()

                if pay_req:
                    merchant_id = pay_req.merchant_id
                    pay_req.status = "FAILED"
                    pay_req.failure_reason = f"{error_code}: {error_desc}"
                    pay_req.meta_data = {
                        **(pay_req.meta_data or {}),
                        "failure_code": error_code,
                        "failure_description": error_desc,
                        "failure_method": method,
                        "failed_at": now.isoformat()
                    }

                if customer:
                    merchant_id = customer.merchant_id
                    customer.failed_payment_count += 1
                    if customer.failed_payment_count >= 2:
                        customer.risk_category = "HIGH"

                formatted_amount = format_inr(amount_paise)
                await AuditService.log_event(
                    db=db,
                    merchant_id=merchant_id,
                    actor_type="RAZORPAY_WEBHOOK",
                    action="RAZORPAY_PAYMENT_FAILED",
                    title=f"Payment of {formatted_amount} failed: {error_code}",
                    details=f"{error_desc} (Payment ID: {pay_id})",
                    metadata={
                        "payment_id": pay_id,
                        "error_code": error_code,
                        "error_description": error_desc,
                        "amount_paise": amount_paise
                    }
                )
                reconciled_details["failed_recorded"] = True

            # -------------------------------------------------------------
            # Event C: payment_link.expired / payment_link.cancelled
            # -------------------------------------------------------------
            elif event_type in ["payment_link.expired", "payment_link.cancelled"]:
                payload_data = payload.get("payload", {})
                link_entity = payload_data.get("payment_link", {}).get("entity", {})
                plink_id = link_entity.get("id")

                if plink_id:
                    pr_stmt = select(PaymentRequest).where(PaymentRequest.razorpay_payment_link_id == plink_id)
                    pr_res = await db.execute(pr_stmt)
                    pay_req = pr_res.scalar_one_or_none()

                    if pay_req:
                        merchant_id = pay_req.merchant_id
                        new_status = "EXPIRED" if "expired" in event_type else "CANCELLED"
                        pay_req.status = new_status
                        
                        await AuditService.log_event(
                            db=db,
                            merchant_id=merchant_id,
                            actor_type="RAZORPAY_WEBHOOK",
                            action=f"PAYMENT_LINK_{new_status}",
                            title=f"Payment Link {plink_id} marked as {new_status}",
                            details=f"Razorpay webhook event {event_type} received.",
                            metadata={"payment_link_id": plink_id, "status": new_status}
                        )
                        reconciled_details["status_updated"] = new_status

            # 5. Persist Webhook Event Record for Idempotency
            webhook_record = WebhookEvent(
                razorpay_event_id=event_id,
                event_type=event_type,
                status="PROCESSED",
                raw_payload=payload,
                received_at=now,
                processed_at=now
            )
            db.add(webhook_record)

            # Commit entire transaction atomically
            await db.commit()
            logger.info(f"Successfully processed and committed webhook {event_id} ({event_type})")

            return {
                "status": "success",
                "message": f"Webhook {event_type} processed successfully",
                "event_id": event_id,
                "event_type": event_type,
                "reconciliation": reconciled_details
            }

        except Exception as e:
            await db.rollback()
            logger.error(f"Error during webhook processing transaction: {e}", exc_info=True)
            raise WebhookProcessingException(f"Transaction rollback: {str(e)}", status_code=500)

    @staticmethod
    def generate_signed_webhook_envelope(
        event_type: str,
        amount_paise: int,
        payment_link_id: Optional[str] = None,
        payment_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        customer_email: str = "accounts@abcltd.in",
        customer_contact: str = "+919876543210",
        error_code: Optional[str] = None,
        error_description: Optional[str] = None,
        secret: Optional[str] = None
    ) -> Tuple[bytes, str, str]:
        """
        Construct a valid, official Razorpay webhook envelope and generate its HMAC-SHA256 signature.
        Returns: (raw_body_bytes, signature_header, event_id)
        """
        now_ts = int(datetime.now(timezone.utc).timestamp())
        event_id = f"evt_sim_{hashlib.sha256(f'{event_type}_{now_ts}_{amount_paise}'.encode()).hexdigest()[:14]}"
        plink_id = payment_link_id or f"plink_sim_{now_ts}"
        pay_id = payment_id or f"pay_sim_{now_ts}"

        payload_content = {
            "entity": "event",
            "account_id": "acc_demo_apex01",
            "event": event_type,
            "contains": ["payment", "payment_link"],
            "payload": {
                "payment": {
                    "entity": {
                        "id": pay_id,
                        "entity": "payment",
                        "amount": amount_paise,
                        "currency": "INR",
                        "status": "captured" if "paid" in event_type or "captured" in event_type else "failed",
                        "method": "upi",
                        "email": customer_email,
                        "contact": customer_contact,
                        "error_code": error_code,
                        "error_description": error_description,
                        "notes": {
                            "payment_link_id": plink_id,
                            "customer_id": customer_id
                        },
                        "created_at": now_ts
                    }
                },
                "payment_link": {
                    "entity": {
                        "id": plink_id,
                        "entity": "payment_link",
                        "amount": amount_paise,
                        "amount_paid": amount_paise if "paid" in event_type else 0,
                        "currency": "INR",
                        "status": "paid" if "paid" in event_type else "created",
                        "notes": {
                            "customer_id": customer_id
                        },
                        "created_at": now_ts
                    }
                }
            },
            "created_at": now_ts
        }

        raw_json_str = json.dumps(payload_content, separators=(',', ':'))
        raw_body_bytes = raw_json_str.encode('utf-8')
        signature = generate_webhook_signature(raw_body_bytes, secret=secret)

        return raw_body_bytes, signature, event_id
