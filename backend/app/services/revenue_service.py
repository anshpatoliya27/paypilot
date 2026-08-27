from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import Dict, Any, List
from decimal import Decimal
import logging

from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from app.core.money import paise_to_rupees

logger = logging.getLogger(__name__)

class RevenueService:
    @staticmethod
    async def get_overview_metrics(db: AsyncSession, merchant_id: str) -> Dict[str, Any]:
        """
        Calculate deterministic financial metrics from database using integer paise arithmetic.
        """
        # 1. Realized revenue from paid payment requests
        paid_query = select(
            func.coalesce(func.sum(PaymentRequest.amount_paise), 0),
            func.count(PaymentRequest.id)
        ).where(
            and_(
                PaymentRequest.merchant_id == merchant_id,
                PaymentRequest.status == "PAID"
            )
        )
        paid_res = await db.execute(paid_query)
        realized_paise, paid_count = paid_res.first()
        realized_paise = int(realized_paise)
        paid_count = int(paid_count)

        # 2. Outstanding balance across all customers
        cust_query = select(
            func.coalesce(func.sum(Customer.outstanding_balance_paise), 0),
            func.count(Customer.id)
        ).where(
            and_(
                Customer.merchant_id == merchant_id,
                Customer.outstanding_balance_paise > 0
            )
        )
        cust_res = await db.execute(cust_query)
        total_outstanding_paise, overdue_customer_count = cust_res.first()
        total_outstanding_paise = int(total_outstanding_paise)
        overdue_customer_count = int(overdue_customer_count)

        # 3. Revenue at risk: overdue >= 7 days or HIGH risk or failed payment count > 0
        risk_query = select(
            func.coalesce(func.sum(Customer.outstanding_balance_paise), 0),
            func.count(Customer.id)
        ).where(
            and_(
                Customer.merchant_id == merchant_id,
                Customer.outstanding_balance_paise > 0,
                or_(
                    Customer.overdue_days >= 7,
                    Customer.risk_category == "HIGH",
                    Customer.failed_payment_count > 0
                )
            )
        )
        risk_res = await db.execute(risk_query)
        at_risk_paise, at_risk_count = risk_res.first()
        at_risk_paise = int(at_risk_paise)
        at_risk_count = int(at_risk_count)

        # 4. Active payment links count
        active_links_query = select(
            func.count(PaymentRequest.id)
        ).where(
            and_(
                PaymentRequest.merchant_id == merchant_id,
                PaymentRequest.status.in_(["CREATED", "PENDING"])
            )
        )
        active_links_res = await db.execute(active_links_query)
        active_links_count = int(active_links_res.scalar_one())

        # 5. Failed payment requests count
        failed_links_query = select(
            func.count(PaymentRequest.id)
        ).where(
            and_(
                PaymentRequest.merchant_id == merchant_id,
                PaymentRequest.status == "FAILED"
            )
        )
        failed_res = await db.execute(failed_links_query)
        failed_links_count = int(failed_res.scalar_one())

        total_links = paid_count + active_links_count + failed_links_count
        recovery_rate = (paid_count / total_links * 100) if total_links > 0 else 0.0

        return {
            "realized_revenue_paise": realized_paise,
            "realized_revenue_rupees": paise_to_rupees(realized_paise),
            "paid_transactions_count": paid_count,
            
            "total_outstanding_paise": total_outstanding_paise,
            "total_outstanding_rupees": paise_to_rupees(total_outstanding_paise),
            "overdue_customers_count": overdue_customer_count,
            
            "revenue_at_risk_paise": at_risk_paise,
            "revenue_at_risk_rupees": paise_to_rupees(at_risk_paise),
            "at_risk_customers_count": at_risk_count,
            
            "active_payment_links": active_links_count,
            "failed_payments_count": failed_links_count,
            "collection_rate_percent": round(recovery_rate, 1),
            "currency": "INR"
        }

    @staticmethod
    async def get_aging_buckets(db: AsyncSession, merchant_id: str) -> Dict[str, Any]:
        """
        Group overdue balances into aging brackets (0-7d, 8-14d, 15+d).
        """
        stmt = select(Customer).where(
            and_(
                Customer.merchant_id == merchant_id,
                Customer.outstanding_balance_paise > 0
            )
        ).order_by(Customer.overdue_days.desc())
        
        result = await db.execute(stmt)
        customers = result.scalars().all()

        bucket_0_7 = {"label": "0-7 Days", "amount_paise": 0, "amount_rupees": Decimal("0.00"), "count": 0, "clients": []}
        bucket_8_14 = {"label": "8-14 Days", "amount_paise": 0, "amount_rupees": Decimal("0.00"), "count": 0, "clients": []}
        bucket_15_plus = {"label": "15+ Days", "amount_paise": 0, "amount_rupees": Decimal("0.00"), "count": 0, "clients": []}

        for c in customers:
            c_paise = c.outstanding_balance_paise
            c_data = {
                "id": c.id,
                "name": c.name,
                "company_name": c.company_name,
                "amount_paise": c_paise,
                "amount_rupees": paise_to_rupees(c_paise),
                "overdue_days": c.overdue_days,
                "risk": c.risk_category
            }
            if c.overdue_days <= 7:
                bucket_0_7["amount_paise"] += c_paise
                bucket_0_7["count"] += 1
                bucket_0_7["clients"].append(c_data)
            elif c.overdue_days <= 14:
                bucket_8_14["amount_paise"] += c_paise
                bucket_8_14["count"] += 1
                bucket_8_14["clients"].append(c_data)
            else:
                bucket_15_plus["amount_paise"] += c_paise
                bucket_15_plus["count"] += 1
                bucket_15_plus["clients"].append(c_data)

        # Convert bucket totals to rupees
        bucket_0_7["amount_rupees"] = paise_to_rupees(bucket_0_7["amount_paise"])
        bucket_8_14["amount_rupees"] = paise_to_rupees(bucket_8_14["amount_paise"])
        bucket_15_plus["amount_rupees"] = paise_to_rupees(bucket_15_plus["amount_paise"])

        total_delinquent_paise = sum(b["amount_paise"] for b in [bucket_0_7, bucket_8_14, bucket_15_plus])

        return {
            "buckets": [bucket_0_7, bucket_8_14, bucket_15_plus],
            "total_delinquent_paise": total_delinquent_paise,
            "total_delinquent_rupees": paise_to_rupees(total_delinquent_paise)
        }
