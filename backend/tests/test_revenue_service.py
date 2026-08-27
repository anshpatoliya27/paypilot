import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from app.services.revenue_service import RevenueService

@pytest.mark.asyncio
async def test_revenue_service_overview_metrics(db_session: AsyncSession, seed_test_merchant: Merchant):
    # Add paid payment: ₹3,50,000 (35,000,000 paise)
    p1 = PaymentRequest(
        merchant_id=seed_test_merchant.id,
        amount_paise=35000000,
        status="PAID",
        description="Paid Retainer"
    )
    # Add customer with overdue: ₹75,500 (7,550,000 paise)
    c1 = Customer(
        merchant_id=seed_test_merchant.id,
        name="ABC Ltd",
        email="abc@ltd.in",
        phone="+919876543210",
        outstanding_balance_paise=7550000,
        risk_category="HIGH",
        overdue_days=9
    )
    db_session.add_all([p1, c1])
    await db_session.commit()

    metrics = await RevenueService.get_overview_metrics(db_session, seed_test_merchant.id)
    
    assert metrics["realized_revenue_paise"] == 35000000
    assert metrics["realized_revenue_rupees"] == Decimal("350000.00")
    assert metrics["paid_transactions_count"] == 1
    assert metrics["total_outstanding_paise"] == 7550000
    assert metrics["total_outstanding_rupees"] == Decimal("75500.00")
    assert metrics["revenue_at_risk_paise"] == 7550000

@pytest.mark.asyncio
async def test_revenue_service_aging_buckets(db_session: AsyncSession, seed_test_merchant: Merchant):
    c1 = Customer(
        merchant_id=seed_test_merchant.id,
        name="C1",
        email="c1@corp.in",
        phone="+919876543210",
        outstanding_balance_paise=1000000, # ₹10,000
        overdue_days=5 # 0-7 days
    )
    c2 = Customer(
        merchant_id=seed_test_merchant.id,
        name="C2",
        email="c2@corp.in",
        phone="+919876543211",
        outstanding_balance_paise=2500000, # ₹25,000
        overdue_days=10 # 8-14 days
    )
    db_session.add_all([c1, c2])
    await db_session.commit()

    aging = await RevenueService.get_aging_buckets(db_session, seed_test_merchant.id)
    buckets = {b["label"]: b for b in aging["buckets"]}

    assert buckets["0-7 Days"]["amount_paise"] == 1000000
    assert buckets["0-7 Days"]["amount_rupees"] == Decimal("10000.00")
    assert buckets["8-14 Days"]["amount_paise"] == 2500000
    assert buckets["8-14 Days"]["amount_rupees"] == Decimal("25000.00")
    assert aging["total_delinquent_paise"] == 3500000
