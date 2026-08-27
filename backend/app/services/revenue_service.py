from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class RevenueService:
    @staticmethod
    async def get_overview_metrics(db: AsyncSession, merchant_id: str) -> Dict[str, Any]:
        """
        Calculate deterministic financial metrics from database:
        - Realized Revenue (Total Paid)
        - Total Outstanding (Pending receivables)
        - Revenue at Risk (Overdue > 7 days or customers with failed payments)
        - Failed Payment Rate
        """
        # Realized revenue from paid payment requests
        paid_query = select(
            func.coalesce(func.sum(PaymentRequest.amount), 0.0),
            func.count(PaymentRequest.id)
        ).where(
            and_(
                PaymentRequest.merchant_id == merchant_id,
                PaymentRequest.status == "PAID"
            )
        )
        paid_res = await db.execute(paid_query)
        realized_amount, paid_count = paid_res.first()

        # Outstanding balance across all customers
        cust_query = select(
            func.coalesce(func.sum(Customer.outstanding_balance), 0.0),
            func.count(Customer.id)
        ).where(
            and_(
                Customer.merchant_id == merchant_id,
                Customer.outstanding_balance > 0
            )
        )
        cust_res = await db.execute(cust_query)
        total_outstanding, overdue_customer_count = cust_res.first()

        # Revenue at risk: overdue > 7 days or high risk category
        risk_query = select(
            func.coalesce(func.sum(Customer.outstanding_balance), 0.0),
            func.count(Customer.id)
        ).where(
            and_(
                Customer.merchant_id == merchant_id,
                Customer.outstanding_balance > 0,
                or_(
                    Customer.overdue_days >= 7,
                    Customer.risk_category == "HIGH",
                    Customer.failed_payment_count > 0
                )
            )
        )
        risk_res = await db.execute(risk_query)
        at_risk_amount, at_risk_count = risk_res.first()

        # Active payment links
        active_links_query = select(
            func.count(PaymentRequest.id)
        ).where(
            and_(
                PaymentRequest.merchant_id == merchant_id,
                PaymentRequest.status.in_(["CREATED", "PENDING"])
            )
        )
        active_links_res = await db.execute(active_links_query)
        active_links_count = active_links_res.scalar_one()

        # Failed payment requests count
        failed_links_query = select(
            func.count(PaymentRequest.id)
        ).where(
            and_(
                PaymentRequest.merchant_id == merchant_id,
                PaymentRequest.status == "FAILED"
            )
        )
        failed_res = await db.execute(failed_links_query)
        failed_links_count = failed_res.scalar_one()

        total_links = paid_count + active_links_count + failed_links_count
        recovery_rate = (paid_count / total_links * 100) if total_links > 0 else 0.0

        return {
            "realized_revenue": float(realized_amount),
            "paid_transactions_count": int(paid_count),
            "total_outstanding": float(total_outstanding),
            "overdue_customers_count": int(overdue_customer_count),
            "revenue_at_risk": float(at_risk_amount),
            "at_risk_customers_count": int(at_risk_count),
            "active_payment_links": int(active_links_count),
            "failed_payments_count": int(failed_links_count),
            "collection_rate_percent": round(recovery_rate, 1),
            "currency": "INR"
        }

    @staticmethod
    async def get_aging_buckets(db: AsyncSession, merchant_id: str) -> Dict[str, Any]:
        """
        Group overdue balances into aging buckets:
        - 0 to 7 days
        - 8 to 14 days
        - 15+ days
        """
        stmt = select(Customer).where(
            and_(
                Customer.merchant_id == merchant_id,
                Customer.outstanding_balance > 0
            )
        )
        result = await db.execute(stmt)
        customers = result.scalars().all()

        bucket_0_7 = {"label": "0-7 Days", "amount": 0.0, "count": 0, "clients": []}
        bucket_8_14 = {"label": "8-14 Days", "amount": 0.0, "count": 0, "clients": []}
        bucket_15_plus = {"label": "15+ Days", "amount": 0.0, "count": 0, "clients": []}

        for c in customers:
            c_data = {
                "id": c.id,
                "name": c.name,
                "company_name": c.company_name,
                "amount": float(c.outstanding_balance),
                "overdue_days": c.overdue_days,
                "risk": c.risk_category
            }
            if c.overdue_days <= 7:
                bucket_0_7["amount"] += float(c.outstanding_balance)
                bucket_0_7["count"] += 1
                bucket_0_7["clients"].append(c_data)
            elif c.overdue_days <= 14:
                bucket_8_14["amount"] += float(c.outstanding_balance)
                bucket_8_14["count"] += 1
                bucket_8_14["clients"].append(c_data)
            else:
                bucket_15_plus["amount"] += float(c.outstanding_balance)
                bucket_15_plus["count"] += 1
                bucket_15_plus["clients"].append(c_data)

        return {
            "buckets": [bucket_0_7, bucket_8_14, bucket_15_plus],
            "total_delinquent_amount": sum(b["amount"] for b in [bucket_0_7, bucket_8_14, bucket_15_plus])
        }

    @staticmethod
    async def get_overdue_customers_list(db: AsyncSession, merchant_id: str, min_days: int = 0) -> List[Dict[str, Any]]:
        """
        Fetch ranked delinquent accounts sorted by urgency (risk + amount).
        """
        stmt = select(Customer).where(
            and_(
                Customer.merchant_id == merchant_id,
                Customer.outstanding_balance > 0,
                Customer.overdue_days >= min_days
            )
        ).order_by(Customer.overdue_days.desc(), Customer.outstanding_balance.desc())
        
        result = await db.execute(stmt)
        customers = result.scalars().all()

        output = []
        for c in customers:
            output.append({
                "id": c.id,
                "name": c.name,
                "company_name": c.company_name,
                "email": c.email,
                "phone": c.phone,
                "outstanding_balance": float(c.outstanding_balance),
                "lifetime_value": float(c.lifetime_value),
                "overdue_days": c.overdue_days,
                "risk_category": c.risk_category,
                "failed_payment_count": c.failed_payment_count,
                "last_payment_date": c.last_payment_date.isoformat() if c.last_payment_date else None
            })
        return output
