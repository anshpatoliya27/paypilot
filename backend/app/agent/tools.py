from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import Dict, Any, List, Optional
import logging

from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from app.services.revenue_service import RevenueService
from app.services.approval_service import ApprovalService

logger = logging.getLogger(__name__)

class AgentTools:
    def __init__(self, db: AsyncSession, merchant_id: str = "merchant_demo_apex_01"):
        self.db = db
        self.merchant_id = merchant_id

    async def get_revenue_metrics(self) -> Dict[str, Any]:
        """
        Fetch real-time financial metrics from the ledger:
        Realized revenue, total outstanding receivables, revenue at risk, and collection rate.
        """
        metrics = await RevenueService.get_overview_metrics(self.db, self.merchant_id)
        return {
            "realized_revenue": float(metrics["realized_revenue_rupees"]),
            "total_outstanding": float(metrics["total_outstanding_rupees"]),
            "revenue_at_risk": float(metrics["revenue_at_risk_rupees"]),
            "collection_rate_percent": metrics["collection_rate_percent"],
            "paid_transactions_count": metrics["paid_transactions_count"],
            "overdue_customers_count": metrics["overdue_customers_count"],
            "active_payment_links": metrics["active_payment_links"],
            "failed_payments_count": metrics["failed_payments_count"],
        }

    async def list_overdue_receivables(self, min_days_overdue: int = 0) -> List[Dict[str, Any]]:
        """
        Query all customers with positive outstanding balance, sorted by overdue days and risk.
        """
        stmt = select(Customer).where(
            and_(
                Customer.merchant_id == self.merchant_id,
                Customer.outstanding_balance_paise > 0,
                Customer.overdue_days >= min_days_overdue
            )
        ).order_by(Customer.overdue_days.desc(), Customer.outstanding_balance_paise.desc())
        
        res = await self.db.execute(stmt)
        customers = res.scalars().all()
        
        return [
            {
                "id": c.id,
                "name": c.name,
                "company_name": c.company_name or "",
                "email": c.email,
                "phone": c.phone,
                "outstanding_balance": float(c.outstanding_balance_rupees),
                "outstanding_balance_paise": c.outstanding_balance_paise,
                "lifetime_value": float(c.lifetime_value_rupees),
                "overdue_days": c.overdue_days,
                "risk_category": c.risk_category,
                "failed_payment_count": c.failed_payment_count
            }
            for c in customers
        ]

    async def get_customer_profile(self, name_or_query: str) -> Optional[Dict[str, Any]]:
        """
        Search for a customer by name, email, or company name and retrieve their financial profile.
        """
        search_pattern = f"%{name_or_query}%"
        stmt = select(Customer).where(
            and_(
                Customer.merchant_id == self.merchant_id,
                or_(
                    Customer.name.ilike(search_pattern),
                    Customer.company_name.ilike(search_pattern),
                    Customer.email.ilike(search_pattern)
                )
            )
        )
        res = await self.db.execute(stmt)
        customer = res.scalars().first()
        if not customer:
            return None

        # Fetch their transactions
        pay_stmt = select(PaymentRequest).where(PaymentRequest.customer_id == customer.id).order_by(PaymentRequest.created_at.desc())
        pay_res = await self.db.execute(pay_stmt)
        payments = pay_res.scalars().all()

        return {
            "id": customer.id,
            "name": customer.name,
            "company_name": customer.company_name or "",
            "email": customer.email,
            "phone": customer.phone,
            "outstanding_balance": float(customer.outstanding_balance_rupees),
            "lifetime_value": float(customer.lifetime_value_rupees),
            "overdue_days": customer.overdue_days,
            "risk_category": customer.risk_category,
            "failed_payment_count": customer.failed_payment_count,
            "transactions_count": len(payments),
            "recent_payments": [
                {
                    "amount": float(p.amount_rupees),
                    "status": p.status,
                    "description": p.description,
                    "date": p.created_at.isoformat() if p.created_at else None
                }
                for p in payments[:3]
            ]
        }

    async def get_failed_payments(self, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieve recent failed payment requests and their error diagnosis.
        """
        stmt = select(PaymentRequest).where(
            and_(
                PaymentRequest.merchant_id == self.merchant_id,
                PaymentRequest.status == "FAILED"
            )
        ).order_by(PaymentRequest.created_at.desc()).limit(limit)
        
        res = await self.db.execute(stmt)
        records = res.scalars().all()
        
        output = []
        for r in records:
            cust_name = "Customer"
            if r.customer_id:
                c_res = await self.db.execute(select(Customer).where(Customer.id == r.customer_id))
                cust = c_res.scalar_one_or_none()
                if cust:
                    cust_name = cust.name

            output.append({
                "payment_link_id": r.razorpay_payment_link_id or r.id,
                "customer_name": cust_name,
                "amount": float(r.amount_rupees),
                "failure_reason": r.failure_reason or "Customer transaction abandoned/timeout",
                "created_at": r.created_at.isoformat() if r.created_at else None
            })
        return output

    async def stage_payment_link(
        self,
        customer_id: Optional[str],
        customer_name: str,
        amount: float,
        description: str,
        expire_in_hours: int = 48,
        agent_reasoning: str = ""
    ) -> Dict[str, Any]:
        """
        Stage a 2-Phase Commit proposal to create a Razorpay Payment Link.
        Requires explicit merchant approval before execution.
        """
        payload = {
            "customer_id": customer_id,
            "customer_name": customer_name,
            "amount": amount,
            "description": description,
            "expire_in_hours": expire_in_hours,
            "notify_sms": True,
            "notify_email": True
        }
        
        approval = await ApprovalService.stage_action(
            db=self.db,
            merchant_id=self.merchant_id,
            action_type="CREATE_PAYMENT_LINK",
            title=f"Create ₹{amount:,.2f} Payment Link for {customer_name}",
            agent_reasoning=agent_reasoning or f"Generated payment request for {customer_name} ({description})",
            payload=payload,
            risk_level="MEDIUM" if amount > 50000 else "LOW"
        )

        return {
            "approval_id": approval.id,
            "action_type": approval.action_type,
            "status": approval.status,
            "title": approval.title,
            "amount": amount,
            "customer_name": customer_name,
            "description": description,
            "agent_reasoning": approval.agent_reasoning,
            "risk_level": approval.risk_level
        }

    async def stage_recovery_campaign(
        self,
        target_customer_ids: List[str],
        agent_reasoning: str = ""
    ) -> Dict[str, Any]:
        """
        Stage a multi-client recovery campaign proposal.
        Prepares personalized Razorpay payment links and recovery messages for review.
        """
        stmt = select(Customer).where(
            and_(
                Customer.merchant_id == self.merchant_id,
                Customer.id.in_(target_customer_ids)
            )
        )
        res = await self.db.execute(stmt)
        customers = res.scalars().all()

        targets = []
        total_recovery_amount = 0.0

        for c in customers:
            amt = float(c.outstanding_balance_rupees)
            total_recovery_amount += amt
            
            # Dynamic personalized note based on risk
            if c.risk_category == "HIGH":
                custom_msg = f"Urgent: Settlement of outstanding invoice (₹{amt:,.2f}) for {c.company_name or c.name} - 48hr validity"
            else:
                custom_msg = f"Friendly reminder: Settlement of outstanding balance (₹{amt:,.2f}) for {c.company_name or c.name}"

            targets.append({
                "customer_id": c.id,
                "customer_name": c.name,
                "company_name": c.company_name or "",
                "customer_email": c.email,
                "customer_phone": c.phone,
                "amount": amt,
                "overdue_days": c.overdue_days,
                "custom_message": custom_msg,
                "expire_in_hours": 48
            })

        payload = {
            "total_amount": total_recovery_amount,
            "target_count": len(targets),
            "targets": targets
        }

        approval = await ApprovalService.stage_action(
            db=self.db,
            merchant_id=self.merchant_id,
            action_type="RECOVERY_CAMPAIGN",
            title=f"Bulk Recovery Campaign: ₹{total_recovery_amount:,.2f} across {len(targets)} client(s)",
            agent_reasoning=agent_reasoning or f"Identified {len(targets)} delinquent accounts totaling ₹{total_recovery_amount:,.2f} at risk.",
            payload=payload,
            risk_level="HIGH" if total_recovery_amount > 50000 else "MEDIUM"
        )

        return {
            "approval_id": approval.id,
            "action_type": approval.action_type,
            "status": approval.status,
            "title": approval.title,
            "total_amount": total_recovery_amount,
            "target_count": len(targets),
            "targets": targets,
            "agent_reasoning": approval.agent_reasoning,
            "risk_level": approval.risk_level
        }
