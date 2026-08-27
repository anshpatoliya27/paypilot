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
        Wipe existing data and seed a rich, realistic business environment
        tailored for the Razorpay Buildathon 2026 demo.
        """
        # Clean tables
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

        # 2. Seed Customers
        customers_data = [
            {
                "id": "cust_abc_ltd_01",
                "merchant_id": merchant.id,
                "name": "Vikram Malhotra",
                "email": "accounts@abcltd.in",
                "phone": "+919876543210",
                "company_name": "ABC Enterprises Ltd",
                "outstanding_balance": 42000.00,
                "lifetime_value": 185000.00,
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
                "outstanding_balance": 25000.00,
                "lifetime_value": 95000.00,
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
                "outstanding_balance": 8500.00,
                "lifetime_value": 45000.00,
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
                "outstanding_balance": 0.00,
                "lifetime_value": 350000.00,
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
                "outstanding_balance": 0.00,
                "lifetime_value": 78000.00,
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
        payments_data = [
            {
                "merchant_id": merchant.id,
                "customer_id": "cust_zenith_corp_04",
                "rzp_payment_link_id": "plink_zenith_350k",
                "rzp_payment_id": "pay_zenith_99812",
                "amount": 350000.00,
                "status": "PAID",
                "description": "Enterprise Cloud Architecture Retainer Q3",
                "short_url": "https://rzp.io/i/zenith350",
                "paid_at": now - timedelta(days=5)
            },
            {
                "merchant_id": merchant.id,
                "customer_id": "cust_devflow_05",
                "rzp_payment_link_id": "plink_devflow_78k",
                "rzp_payment_id": "pay_devflow_55410",
                "amount": 78000.00,
                "status": "PAID",
                "description": "Frontend Modernization Milestone 2",
                "short_url": "https://rzp.io/i/devflow78",
                "paid_at": now - timedelta(days=12)
            },
            {
                "merchant_id": merchant.id,
                "customer_id": "cust_abc_ltd_01",
                "rzp_payment_link_id": "plink_abc_failed_01",
                "amount": 42000.00,
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
            "total_outstanding": 75500.00,
            "realized_revenue": 428000.00,
            "overdue_clients": 3,
            "message": "Demo fixture initialized with ₹75,500 overdue across ABC Ltd, Rahul Sharma, and Priya Mehta."
        }
