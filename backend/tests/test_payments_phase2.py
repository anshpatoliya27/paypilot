import pytest
from httpx import AsyncClient
from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_payment_link_lifecycle_sync_and_cancel(
    async_client: AsyncClient,
    db_session: AsyncSession,
    seed_test_merchant: Merchant
):
    customer = Customer(
        merchant_id=seed_test_merchant.id,
        name="Vikram Malhotra",
        email="accounts@abcltd.in",
        phone="+919876543210",
        outstanding_balance_paise=4200000
    )
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    # 1. Create Link
    create_res = await async_client.post(
        "/api/v1/payments/links",
        json={
            "customer_id": customer.id,
            "amount_rupees": "42000.00",
            "description": "Retainer Fee Q3"
        }
    )
    assert create_res.status_code == 201
    created_data = create_res.json()
    link_id = created_data["id"]
    assert created_data["status"] == "CREATED"
    assert created_data["amount_paise"] == 4200000

    # 2. Sync Link
    sync_res = await async_client.post(f"/api/v1/payments/links/{link_id}/sync")
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["success"] is True

    # 3. Cancel Link
    cancel_res = await async_client.post(f"/api/v1/payments/links/{link_id}/cancel")
    assert cancel_res.status_code == 200
    cancel_data = cancel_res.json()
    assert cancel_data["status"] == "CANCELLED"
