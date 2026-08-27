import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from app.models.audit_log import AuditLog
from app.services.webhook_service import WebhookService

@pytest.mark.asyncio
async def test_payment_link_paid_reconciliation(
    db_session: AsyncSession,
    seed_test_merchant: Merchant
):
    customer = Customer(
        merchant_id=seed_test_merchant.id,
        name="Rahul Sharma",
        email="rahul@example.com",
        phone="+919876543211",
        outstanding_balance_paise=2500000, # ₹25,000
        lifetime_value_paise=5000000,
        risk_category="MEDIUM",
        overdue_days=11
    )
    db_session.add(customer)
    await db_session.flush()

    payment_req = PaymentRequest(
        merchant_id=seed_test_merchant.id,
        customer_id=customer.id,
        razorpay_payment_link_id="plink_rahul_25k",
        amount_paise=2500000,
        status="CREATED"
    )
    db_session.add(payment_req)
    await db_session.commit()

    raw_body, signature, event_id = WebhookService.generate_signed_webhook_envelope(
        event_type="payment_link.paid",
        amount_paise=2500000,
        payment_link_id="plink_rahul_25k"
    )

    result = await WebhookService.process_webhook(
        db=db_session,
        raw_body=raw_body,
        signature_header=signature,
        event_id_header=event_id
    )

    assert result["status"] == "success"

    await db_session.refresh(customer)
    await db_session.refresh(payment_req)

    assert customer.outstanding_balance_paise == 0
    assert customer.lifetime_value_paise == 7500000
    assert customer.overdue_days == 0
    assert customer.risk_category == "LOW"
    assert payment_req.status == "PAID"
    assert payment_req.paid_at is not None

@pytest.mark.asyncio
async def test_payment_failed_reconciliation(
    db_session: AsyncSession,
    seed_test_merchant: Merchant
):
    customer = Customer(
        merchant_id=seed_test_merchant.id,
        name="ABC Ltd",
        email="abc@ltd.in",
        phone="+919876543210",
        outstanding_balance_paise=4200000,
        failed_payment_count=1,
        risk_category="MEDIUM"
    )
    db_session.add(customer)
    await db_session.flush()

    payment_req = PaymentRequest(
        merchant_id=seed_test_merchant.id,
        customer_id=customer.id,
        razorpay_payment_link_id="plink_abc_fail",
        amount_paise=4200000,
        status="CREATED"
    )
    db_session.add(payment_req)
    await db_session.commit()

    raw_body, signature, event_id = WebhookService.generate_signed_webhook_envelope(
        event_type="payment.failed",
        amount_paise=4200000,
        payment_link_id="plink_abc_fail",
        error_code="BAD_REQUEST_ERROR",
        error_description="Customer bank server timed out during OTP verification"
    )

    result = await WebhookService.process_webhook(
        db=db_session,
        raw_body=raw_body,
        signature_header=signature,
        event_id_header=event_id
    )

    assert result["status"] == "success"

    await db_session.refresh(customer)
    await db_session.refresh(payment_req)

    assert payment_req.status == "FAILED"
    assert "BAD_REQUEST_ERROR" in payment_req.failure_reason
    assert customer.failed_payment_count == 2
    assert customer.risk_category == "HIGH" # Escalated after 2 failures

@pytest.mark.asyncio
async def test_payment_link_expired_and_cancelled(
    db_session: AsyncSession,
    seed_test_merchant: Merchant
):
    p_exp = PaymentRequest(
        merchant_id=seed_test_merchant.id,
        razorpay_payment_link_id="plink_exp_01",
        amount_paise=1000000,
        status="CREATED"
    )
    p_can = PaymentRequest(
        merchant_id=seed_test_merchant.id,
        razorpay_payment_link_id="plink_can_01",
        amount_paise=1000000,
        status="CREATED"
    )
    db_session.add_all([p_exp, p_can])
    await db_session.commit()

    # Expire
    raw1, sig1, eid1 = WebhookService.generate_signed_webhook_envelope(
        event_type="payment_link.expired",
        amount_paise=1000000,
        payment_link_id="plink_exp_01"
    )
    await WebhookService.process_webhook(db_session, raw1, sig1, eid1)
    await db_session.refresh(p_exp)
    assert p_exp.status == "EXPIRED"

    # Cancel
    raw2, sig2, eid2 = WebhookService.generate_signed_webhook_envelope(
        event_type="payment_link.cancelled",
        amount_paise=1000000,
        payment_link_id="plink_can_01"
    )
    await WebhookService.process_webhook(db_session, raw2, sig2, eid2)
    await db_session.refresh(p_can)
    assert p_can.status == "CANCELLED"
