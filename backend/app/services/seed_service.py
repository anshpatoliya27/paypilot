from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime, timezone, timedelta
from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from app.models.approval import Approval
from app.models.audit_log import AuditLog
from app.models.webhook_event import WebhookEvent
import logging

logger = logging.getLogger(__name__)

class SeedService:
    @staticmethod
    async def reset_and_seed_demo_data(db: AsyncSession) -> dict:
        """
        Wipe existing data and seed a deterministic, realistic business scenario
        using integer paise values.
        """
        # Clean tables in reverse dependency order
        await db.execute(delete(PaymentRequest))
        await db.execute(delete(Approval))
        await db.execute(delete(AuditLog))
        await db.execute(delete(WebhookEvent))
        await db.execute(delete(Customer))
        await db.execute(delete(Merchant))
        await db.commit()

        # 1. Create Default Merchant
        merchant = Merchant(
            id="merchant_demo_apex_01",
            name="Rohan Patel",
            email="rohan@apexstudios.in",
            business_name="Apex Creative & Tech Studios",
            currency="INR"
        )
        db.add(merchant)
        await db.flush()

        now = datetime.now(timezone.utc)

        # 2. Seed Customers (Amounts in Paise: 1 INR = 100 Paise)
        # ABC Ltd: ₹42,000 overdue = 4,200,000 paise
        # Rahul Sharma: ₹25,000 overdue = 2,500,000 paise
        # Priya Mehta: ₹8,500 overdue = 850,000 paise
        # Total Outstanding: ₹75,500 = 7,550,000 paise
        customers_data = [
            {
                "id": "cust_abc_ltd_01",
                "merchant_id": merchant.id,
                "name": "Vikram Malhotra",
                "email": "accounts@abcltd.in",
                "phone": "+919876543210",
                "company_name": "ABC Enterprises Ltd",
                "outstanding_balance_paise": 4200000,
                "lifetime_value_paise": 18500000,
                "risk_category": "HIGH",
                "failed_payment_count": 2,
                "overdue_days": 9,
                "last_payment_date": now - timedelta(days=45)
            },
            {
                "id": "cust_rahul_sharma_02",
                "merchant_id": merchant.id,
                "name": "Rahul Sharma",
                "email": "rahul.sharma@techcorp.in",
                "phone": "+919876543211",
                "company_name": "TechCorp Solutions",
                "outstanding_balance_paise": 2500000,
                "lifetime_value_paise": 9500000,
                "risk_category": "MEDIUM",
                "failed_payment_count": 1,
                "overdue_days": 11,
                "last_payment_date": now - timedelta(days=60)
            },
            {
                "id": "cust_priya_mehta_03",
                "merchant_id": merchant.id,
                "name": "Priya Mehta",
                "email": "priya@designhub.co",
                "phone": "+919876543212",
                "company_name": "DesignHub Studio",
                "outstanding_balance_paise": 850000,
                "lifetime_value_paise": 4500000,
                "risk_category": "LOW",
                "failed_payment_count": 0,
                "overdue_days": 8,
                "last_payment_date": now - timedelta(days=30)
            },
            {
                "id": "cust_zenith_corp_04",
                "merchant_id": merchant.id,
                "name": "Amit Singhal",
                "email": "finance@zenithcorp.com",
                "phone": "+919876543213",
                "company_name": "Zenith Global Corp",
                "outstanding_balance_paise": 0,
                "lifetime_value_paise": 35000000,
                "risk_category": "LOW",
                "failed_payment_count": 0,
                "overdue_days": 0,
                "last_payment_date": now - timedelta(days=5)
            },
            {
                "id": "cust_devflow_05",
                "merchant_id": merchant.id,
                "name": "Kavita Rao",
                "email": "kavita@devflow.io",
                "phone": "+919876543214",
                "company_name": "DevFlow Systems",
                "outstanding_balance_paise": 0,
                "lifetime_value_paise": 7800000,
                "risk_category": "LOW",
                "failed_payment_count": 0,
                "overdue_days": 0,
                "last_payment_date": now - timedelta(days=12)
            }
        ]

        for c_dict in customers_data:
            cust = Customer(**c_dict)
            db.add(cust)
        await db.flush()

        # 3. Seed Realized & Historical Payment Requests
        # Realized revenue: ₹3,50,000 (35,000,000 paise) + ₹78,000 (7,800,000 paise) = ₹4,28,000 (42,800,000 paise)
        payments_data = [
            {
                "merchant_id": merchant.id,
                "customer_id": "cust_zenith_corp_04",
                "razorpay_payment_link_id": "plink_zenith_350k",
                "razorpay_payment_id": "pay_zenith_99812",
                "amount_paise": 35000000,
                "status": "PAID",
                "description": "Enterprise Cloud Architecture Retainer Q3",
                "short_url": "https://rzp.io/i/zenith350",
                "paid_at": now - timedelta(days=5)
            },
            {
                "merchant_id": merchant.id,
                "customer_id": "cust_devflow_05",
                "razorpay_payment_link_id": "plink_devflow_78k",
                "razorpay_payment_id": "pay_devflow_55410",
                "amount_paise": 7800000,
                "status": "PAID",
                "description": "Frontend Modernization Milestone 2",
                "short_url": "https://rzp.io/i/devflow78",
                "paid_at": now - timedelta(days=12)
            },
            {
                "merchant_id": merchant.id,
                "customer_id": "cust_abc_ltd_01",
                "razorpay_payment_link_id": "plink_abc_failed_01",
                "amount_paise": 4200000,
                "status": "FAILED",
                "description": "Custom API Integrations & Webhooks Module",
                "short_url": "https://rzp.io/i/abcfail01",
                "failure_reason": "BAD_REQUEST_ERROR: Customer bank server timeout during OTP verification",
                "created_at": now - timedelta(days=9)
            }
        ]

        for p_dict in payments_data:
            pay = PaymentRequest(**p_dict)
            db.add(pay)

        # 4. Seed Audit Trail
        audit_events = [
            {
                "merchant_id": merchant.id,
                "actor_type": "SYSTEM",
                "action": "LEDGER_INITIALIZED",
                "title": "PayPilot Autonomous Ledger Initialized",
                "details": "Synchronized with Razorpay Merchant Account rohan@apexstudios.in"
            },
            {
                "merchant_id": merchant.id,
                "actor_type": "RAZORPAY_WEBHOOK",
                "action": "PAYMENT_CAPTURED",
                "title": "Payment of ₹3,50,000 received from Zenith Global Corp",
                "details": "Razorpay payment ID pay_zenith_99812 verified via HMAC signature."
            },
            {
                "merchant_id": merchant.id,
                "actor_type": "AGENT",
                "action": "ANOMALY_DETECTED",
                "title": "High Risk Overdue Alert: ABC Enterprises Ltd",
                "details": "₹42,000 is 9 days overdue with 2 previous failed payment attempts."
            }
        ]

        for a_dict in audit_events:
            audit = AuditLog(**a_dict)
            db.add(audit)

        await db.commit()

        return {
            "status": "success",
            "merchant_id": merchant.id,
            "total_outstanding_paise": 7550000,
            "realized_revenue_paise": 42800000,
            "overdue_clients": 3,
            "message": "Demo fixture initialized with ₹75,500 overdue across ABC Ltd, Rahul Sharma, and Priya Mehta."
        }
