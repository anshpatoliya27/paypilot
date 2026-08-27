import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal
from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from app.services.webhook_service import WebhookService

@pytest.mark.asyncio
async def test_webhook_idempotency_prevents_duplicate_reconciliation(
    db_session: AsyncSession,
    seed_test_merchant: Merchant
):
    # Setup Customer: ₹42,000 overdue (4,200,000 paise)
    customer = Customer(
        merchant_id=seed_test_merchant.id,
        name="ABC Enterprises Ltd",
        email="accounts@abcltd.in",
        phone="+919876543210",
        outstanding_balance_paise=4200000,
        lifetime_value_paise=10000000,
        risk_category="HIGH",
        overdue_days=9
    )
    db_session.add(customer)
    await db_session.flush()

    # Setup Payment Request: ₹42,000
    payment_req = PaymentRequest(
        merchant_id=seed_test_merchant.id,
        customer_id=customer.id,
        razorpay_payment_link_id="plink_abc_42k",
        amount_paise=4200000,
        status="CREATED",
        description="Invoice ABC-42k"
    )
    db_session.add(payment_req)
    await db_session.commit()

    # Generate Signed Webhook Envelope
    raw_body, signature, event_id = WebhookService.generate_signed_webhook_envelope(
        event_type="payment_link.paid",
        amount_paise=4200000,
        payment_link_id="plink_abc_42k",
        customer_email="accounts@abcltd.in",
        customer_contact="+919876543210"
    )

    # 1. First Webhook Ingestion
    res1 = await WebhookService.process_webhook(
        db=db_session,
        raw_body=raw_body,
        signature_header=signature,
        event_id_header=event_id
    )
    assert res1["status"] == "success"
    assert res1["event_id"] == event_id

    # Verify Customer Ledger after 1st execution
    await db_session.refresh(customer)
    await db_session.refresh(payment_req)
    assert customer.outstanding_balance_paise == 0
    assert customer.lifetime_value_paise == 14200000 # 10M + 4.2M
    assert payment_req.status == "PAID"

    # 2. Duplicate Webhook Ingestion (Same event_id and payload)
    res2 = await WebhookService.process_webhook(
        db=db_session,
        raw_body=raw_body,
        signature_header=signature,
        event_id_header=event_id
    )
    assert res2["status"] == "duplicate"
    assert "already processed" in res2["message"].lower()

    # Verify Customer Ledger has NOT double-decreased or double-added LTV!
    await db_session.refresh(customer)
    await db_session.refresh(payment_req)
    assert customer.outstanding_balance_paise == 0
    assert customer.lifetime_value_paise == 14200000 # Remains unchanged
    assert payment_req.status == "PAID"
