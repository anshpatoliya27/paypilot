import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.customer import Customer
from app.models.merchant import Merchant
from app.repositories.customer_repository import CustomerRepository
from app.repositories.payment_repository import PaymentRepository
from app.repositories.merchant_repository import MerchantRepository

@pytest.mark.asyncio
async def test_customer_repository_filters(db_session: AsyncSession, seed_test_merchant: Merchant):
    cust_repo = CustomerRepository(db_session)
    
    c1 = Customer(
        merchant_id=seed_test_merchant.id,
        name="ABC Ltd",
        email="abc@ltd.in",
        phone="+919876543210",
        outstanding_balance_paise=4200000,
        risk_category="HIGH",
        overdue_days=9
    )
    c2 = Customer(
        merchant_id=seed_test_merchant.id,
        name="Zenith Corp",
        email="zenith@corp.in",
        phone="+919876543211",
        outstanding_balance_paise=0,
        risk_category="LOW",
        overdue_days=0
    )
    db_session.add_all([c1, c2])
    await db_session.commit()

    all_custs = await cust_repo.list_by_merchant(seed_test_merchant.id)
    assert len(all_custs) == 2

    overdue_only = await cust_repo.list_by_merchant(seed_test_merchant.id, overdue_only=True)
    assert len(overdue_only) == 1
    assert overdue_only[0].name == "ABC Ltd"

    high_risk_only = await cust_repo.list_by_merchant(seed_test_merchant.id, risk_category="HIGH")
    assert len(high_risk_only) == 1
    assert high_risk_only[0].risk_category == "HIGH"
