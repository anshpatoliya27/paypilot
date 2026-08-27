from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from decimal import Decimal
import logging

from app.core.database import get_db
from app.core.money import rupees_to_paise
from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from app.services.webhook_service import WebhookService, WebhookProcessingException
from app.schemas.webhook import WebhookResponse, WebhookSimulationRequest, WebhookSimulationResponse

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/razorpay", response_model=WebhookResponse)
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    x_razorpay_event_id: Optional[str] = Header(None, alias="X-Razorpay-Event-Id"),
    db: AsyncSession = Depends(get_db)
):
    """
    Official Razorpay Webhook Ingestion Endpoint.
    1. Extracts raw request body.
    2. Cryptographically validates HMAC-SHA256 signature using X-Razorpay-Signature header.
    3. Guarantees idempotency via WebhookEvent database table.
    4. Reconciles payment link status and customer financial ledger within an atomic transaction.
    5. Appends structured immutable audit log.
    """
    raw_body = await request.body()
    
    try:
        result = await WebhookService.process_webhook(
            db=db,
            raw_body=raw_body,
            signature_header=x_razorpay_signature,
            event_id_header=x_razorpay_event_id
        )
        return WebhookResponse(
            status=result["status"],
            message=result["message"],
            event_id=result["event_id"],
            event_type=result["event_type"],
            reconciliation=result.get("reconciliation")
        )
    except WebhookProcessingException as e:
        logger.warning(f"Webhook processing failed: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error in webhook route: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal webhook processing error")


@router.post("/simulate", response_model=WebhookSimulationResponse)
async def simulate_signed_webhook(
    payload: WebhookSimulationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Development & Demo Webhook Test Harness.
    Generates an official Razorpay webhook envelope and signs it with HMAC-SHA256.
    The generated signed payload is then piped directly through the REAL webhook verification
    and reconciliation pipeline to ensure complete end-to-end correctness.
    """
    # 1. Target Customer
    customer = None
    if payload.customer_id:
        cust_stmt = select(Customer).where(Customer.id == payload.customer_id)
        cust_res = await db.execute(cust_stmt)
        customer = cust_res.scalar_one_or_none()
    else:
        # Default to highest overdue customer (e.g. ABC Ltd)
        cust_stmt = select(Customer).where(Customer.outstanding_balance_paise > 0).order_by(Customer.outstanding_balance_paise.desc())
        cust_res = await db.execute(cust_stmt)
        customer = cust_res.scalars().first()

    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No customer found for simulation")

    # 2. Target or Create Active Payment Link
    pr_stmt = select(PaymentRequest).where(
        PaymentRequest.customer_id == customer.id
    ).order_by(PaymentRequest.created_at.desc())
    pr_res = await db.execute(pr_stmt)
    payment_req = pr_res.scalars().first()

    amount_paise = rupees_to_paise(payload.amount_rupees)
    plink_id = payment_req.razorpay_payment_link_id if payment_req else f"plink_sim_{customer.id[:8]}"

    # 3. Generate Signed Webhook Envelope
    raw_body, signature, event_id = WebhookService.generate_signed_webhook_envelope(
        event_type=payload.event_type,
        amount_paise=amount_paise,
        payment_link_id=plink_id,
        customer_id=customer.id,
        customer_email=customer.email,
        customer_contact=customer.phone,
        error_code=payload.failure_code if "failed" in payload.event_type else None,
        error_description=payload.failure_description if "failed" in payload.event_type else None
    )

    # 4. Execute Real Webhook Processing Pipeline
    try:
        proc_result = await WebhookService.process_webhook(
            db=db,
            raw_body=raw_body,
            signature_header=signature,
            event_id_header=event_id
        )
        return WebhookSimulationResponse(
            success=True,
            status=proc_result["status"],
            message=proc_result["message"],
            event_id=proc_result["event_id"],
            event_type=proc_result["event_type"],
            signature=signature,
            reconciliation=proc_result.get("reconciliation")
        )
    except WebhookProcessingException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Simulation verification failed: {e.message}")
