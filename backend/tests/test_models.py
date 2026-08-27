import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from decimal import Decimal
from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from app.models.approval import Approval
from app.models.audit_log import AuditLog
from app.models.webhook_event import WebhookEvent

@pytest.mark.asyncio
async def test_merchant_customer_relationships(db_session: AsyncSession):
    merchant = Merchant(
        name="Test Merchant",
        email="test@merchant.com",
        business_name="Test Corp",
        currency="INR"
    )
    db_session.add(merchant)
    await db_session.commit()
    await db_session.refresh(merchant)

    customer = Customer(
        merchant_id=merchant.id,
        name="Rahul Sharma",
        email="rahul@example.com",
        phone="+919876543210",
        outstanding_balance_paise=2500000,
        risk_category="MEDIUM"
    )
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    assert customer.outstanding_balance_paise == 2500000
    assert customer.outstanding_balance_rupees == Decimal("25000.00")
    assert customer.merchant.id == merchant.id

@pytest.mark.asyncio
async def test_payment_request_creation(db_session: AsyncSession):
    merchant = Merchant(name="M1", email="m1@corp.com", business_name="M1 Corp")
    db_session.add(merchant)
    await db_session.flush()

    payment = PaymentRequest(
        merchant_id=merchant.id,
        razorpay_payment_link_id="plink_test_12345",
        amount_paise=4200000,
        status="CREATED",
        description="Invoice Retainer"
    )
    db_session.add(payment)
    await db_session.commit()
    await db_session.refresh(payment)

    assert payment.amount_paise == 4200000
    assert payment.amount_rupees == Decimal("42000.00")
    assert payment.status == "CREATED"

@pytest.mark.asyncio
async def test_webhook_event_idempotency_constraint(db_session: AsyncSession):
    event1 = WebhookEvent(
        razorpay_event_id="evt_unique_123",
        event_type="payment.captured",
        raw_payload={"test": "payload"}
    )
    db_session.add(event1)
    await db_session.commit()

    event2 = WebhookEvent(
        razorpay_event_id="evt_unique_123",
        event_type="payment.captured",
        raw_payload={"duplicate": "payload"}
    )
    db_session.add(event2)
    with pytest.raises(Exception):
        await db_session.commit()
