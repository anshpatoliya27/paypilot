from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
import uuid
import logging

from app.models.approval import Approval
from app.models.payment_request import PaymentRequest
from app.models.customer import Customer
from app.services.razorpay_service import razorpay_service
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

class ApprovalService:
    @staticmethod
    async def stage_action(
        db: AsyncSession,
        merchant_id: str,
        action_type: str,
        title: str,
        agent_reasoning: str,
        payload: Dict[str, Any],
        risk_level: str = "MEDIUM"
    ) -> Approval:
        """
        Stage a mutating/financial action proposal in PENDING status.
        Does NOT execute until explicit human approval.
        """
        approval = Approval(
            merchant_id=merchant_id,
            action_type=action_type,
            risk_level=risk_level,
            status="PENDING",
            title=title,
            agent_reasoning=agent_reasoning,
            payload=payload
        )
        db.add(approval)
        await db.commit()
        await db.refresh(approval)

        await AuditService.log_event(
            db=db,
            merchant_id=merchant_id,
            actor_type="AGENT",
            action="PROPOSAL_STAGED",
            title=f"Agent proposed {action_type}: {title}",
            details=agent_reasoning,
            metadata={"approval_id": approval.id, "risk_level": risk_level, "payload": payload}
        )

        return approval

    @staticmethod
    async def list_approvals(db: AsyncSession, merchant_id: str, status: Optional[str] = None) -> List[Approval]:
        query = select(Approval).where(Approval.merchant_id == merchant_id)
        if status:
            query = query.where(Approval.status == status)
        query = query.order_by(Approval.created_at.desc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def resolve_approval(
        db: AsyncSession,
        merchant_id: str,
        approval_id: str,
        action: str, # "APPROVE" or "REJECT"
        modified_payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Resolve a staged proposal:
        If APPROVE: executes the action via official Razorpay APIs, updates ledger, and logs result.
        If REJECT: marks approval as REJECTED.
        """
        stmt = select(Approval).where(
            and_(
                Approval.id == approval_id,
                Approval.merchant_id == merchant_id
            )
        )
        result = await db.execute(stmt)
        approval = result.scalar_one_or_none()
        
        if not approval:
            raise ValueError(f"Approval request {approval_id} not found.")

        if approval.status != "PENDING":
            return {
                "success": False,
                "message": f"Approval {approval_id} has already been {approval.status.lower()}.",
                "approval": approval
            }

        effective_payload = modified_payload or approval.payload

        if action == "REJECT":
            approval.status = "REJECTED"
            approval.resolved_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(approval)

            await AuditService.log_event(
                db=db,
                merchant_id=merchant_id,
                actor_type="MERCHANT",
                action="PROPOSAL_REJECTED",
                title=f"Merchant rejected {approval.title}",
                details="Action was cancelled by the merchant.",
                metadata={"approval_id": approval.id}
            )
            return {"success": True, "status": "REJECTED", "approval_id": approval.id}

        # Handle APPROVE
        approval.status = "EXECUTING"
        await db.commit()

        try:
            execution_results = []
            
            if approval.action_type == "CREATE_PAYMENT_LINK":
                # Single payment link creation
                amount = float(effective_payload.get("amount", 0))
                customer_id = effective_payload.get("customer_id")
                desc = effective_payload.get("description", "Payment request")
                expire_hours = int(effective_payload.get("expire_in_hours", 48))
                
                # Fetch customer
                cust_stmt = select(Customer).where(Customer.id == customer_id)
                cust_res = await db.execute(cust_stmt)
                customer = cust_res.scalar_one_or_none()
                
                cust_name = customer.name if customer else effective_payload.get("customer_name", "Customer")
                cust_email = customer.email if customer else effective_payload.get("customer_email", "")
                cust_phone = customer.phone if customer else effective_payload.get("customer_phone", "")

                rzp_res = razorpay_service.create_payment_link(
                    amount_rupees=amount,
                    customer_name=cust_name,
                    customer_email=cust_email,
                    customer_phone=cust_phone,
                    description=desc,
                    expire_in_hours=expire_hours,
                    notify_sms=effective_payload.get("notify_sms", True),
                    notify_email=effective_payload.get("notify_email", True),
                    reminder_enable=True
                )

                # Create PaymentRequest in DB
                expires_at_dt = None
                if rzp_res.get("expires_at"):
                    try:
                        expires_at_dt = datetime.fromisoformat(rzp_res["expires_at"].replace("Z", "+00:00"))
                    except Exception:
                        expires_at_dt = datetime.now(timezone.utc) + timedelta(hours=expire_hours)

                payment_req = PaymentRequest(
                    merchant_id=merchant_id,
                    customer_id=customer.id if customer else None,
                    rzp_payment_link_id=rzp_res.get("id"),
                    amount=amount,
                    status="CREATED",
                    description=desc,
                    short_url=rzp_res.get("short_url"),
                    expires_at=expires_at_dt,
                    meta_data={"approval_id": approval.id, "razorpay_response": rzp_res.get("raw_response")}
                )
                db.add(payment_req)
                execution_results.append(rzp_res)

            elif approval.action_type == "RECOVERY_CAMPAIGN":
                # Multi-client recovery campaign
                targets = effective_payload.get("targets", [])
                for target in targets:
                    amount = float(target.get("amount", 0))
                    customer_id = target.get("customer_id")
                    desc = target.get("custom_message", f"Payment recovery for outstanding dues")
                    expire_hours = int(target.get("expire_in_hours", 48))

                    cust_stmt = select(Customer).where(Customer.id == customer_id)
                    cust_res = await db.execute(cust_stmt)
                    customer = cust_res.scalar_one_or_none()

                    cust_name = customer.name if customer else target.get("customer_name", "Customer")
                    cust_email = customer.email if customer else target.get("customer_email", "")
                    cust_phone = customer.phone if customer else target.get("customer_phone", "")

                    rzp_res = razorpay_service.create_payment_link(
                        amount_rupees=amount,
                        customer_name=cust_name,
                        customer_email=cust_email,
                        customer_phone=cust_phone,
                        description=desc,
                        expire_in_hours=expire_hours,
                        notify_sms=True,
                        notify_email=True,
                        reminder_enable=True
                    )

                    expires_at_dt = datetime.now(timezone.utc) + timedelta(hours=expire_hours)
                    payment_req = PaymentRequest(
                        merchant_id=merchant_id,
                        customer_id=customer.id if customer else None,
                        rzp_payment_link_id=rzp_res.get("id"),
                        amount=amount,
                        status="CREATED",
                        description=desc,
                        short_url=rzp_res.get("short_url"),
                        expires_at=expires_at_dt,
                        meta_data={"campaign_approval_id": approval.id, "target": target}
                    )
                    db.add(payment_req)
                    execution_results.append({
                        "customer_name": cust_name,
                        "amount": amount,
                        "payment_link_id": rzp_res.get("id"),
                        "short_url": rzp_res.get("short_url")
                    })

            approval.status = "EXECUTED"
            approval.execution_result = {"results": execution_results}
            approval.resolved_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(approval)

            await AuditService.log_event(
                db=db,
                merchant_id=merchant_id,
                actor_type="MERCHANT",
                action="PROPOSAL_APPROVED_AND_EXECUTED",
                title=f"Executed {approval.action_type}: {approval.title}",
                details=f"Successfully executed with {len(execution_results)} action(s).",
                metadata={"approval_id": approval.id, "results": execution_results}
            )

            return {
                "success": True,
                "status": "EXECUTED",
                "approval_id": approval.id,
                "results": execution_results
            }

        except Exception as e:
            logger.error(f"Execution failed for approval {approval_id}: {e}", exc_info=True)
            approval.status = "FAILED"
            approval.execution_result = {"error": str(e)}
            await db.commit()
            return {"success": False, "status": "FAILED", "error": str(e)}
