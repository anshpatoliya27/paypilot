import pytest
from httpx import AsyncClient
from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_webhook_simulator_endpoint_e2e(
    async_client: AsyncClient,
    db_session: AsyncSession,
    seed_test_merchant: Merchant
):
    # Setup Customer: ₹42,000 overdue
    customer = Customer(
        merchant_id=seed_test_merchant.id,
        name="ABC Enterprises Ltd",
        email="accounts@abcltd.in",
        phone="+919876543210",
        outstanding_balance_paise=4200000,
        risk_category="HIGH"
    )
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    # Call simulator endpoint
    sim_payload = {
        "customer_id": customer.id,
        "amount_rupees": "42000.00",
        "event_type": "payment_link.paid"
    }
    response = await async_client.post("/api/v1/webhooks/simulate", json=sim_payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["status"] == "success"
    assert data["event_type"] == "payment_link.paid"
    assert "signature" in data
    assert len(data["signature"]) == 64

    # Verify that the customer outstanding balance was reduced in DB
    await db_session.refresh(customer)
    assert customer.outstanding_balance_paise == 0
    assert customer.risk_category == "LOW"
