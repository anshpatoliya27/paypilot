import pytest
from httpx import AsyncClient
from decimal import Decimal

@pytest.mark.asyncio
async def test_create_and_list_customers_api(async_client: AsyncClient):
    # 1. Create customer
    create_payload = {
        "name": "Kavita Rao",
        "email": "kavita@devflow.io",
        "phone": "+919876543214",
        "company_name": "DevFlow Systems",
        "outstanding_balance_rupees": "15000.00",
        "risk_category": "MEDIUM"
    }
    res = await async_client.post("/api/v1/customers", json=create_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Kavita Rao"
    assert data["outstanding_balance_paise"] == 1500000
    assert data["outstanding_balance_rupees"] == "15000.00"
    cust_id = data["id"]

    # 2. List customers
    list_res = await async_client.get("/api/v1/customers")
    assert list_res.status_code == 200
    customers = list_res.json()
    assert any(c["id"] == cust_id for c in customers)

    # 3. Get customer detail
    detail_res = await async_client.get(f"/api/v1/customers/{cust_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["customer"]["id"] == cust_id
    assert "payments" in detail

@pytest.mark.asyncio
async def test_create_payment_link_api(async_client: AsyncClient):
    link_payload = {
        "customer_name": "Vikram Malhotra",
        "customer_email": "accounts@abcltd.in",
        "customer_phone": "+919876543210",
        "amount_rupees": "42000.00",
        "description": "Custom API Integration Invoice",
        "expire_in_hours": 48
    }
    res = await async_client.post("/api/v1/payments/links", json=link_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["amount_paise"] == 4200000
    assert data["amount_rupees"] == "42000.00"
    assert data["status"] == "CREATED"
    assert data["razorpay_payment_link_id"].startswith("plink_")
    assert "https://rzp.io/i/" in data["short_url"]

@pytest.mark.asyncio
async def test_analytics_overview_api(async_client: AsyncClient):
    res = await async_client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert "realized_revenue_paise" in data
    assert "total_outstanding_paise" in data
    assert "revenue_at_risk_paise" in data

@pytest.mark.asyncio
async def test_analytics_overdue_aging_api(async_client: AsyncClient):
    res = await async_client.get("/api/v1/analytics/overdue")
    assert res.status_code == 200
    data = res.json()
    assert "buckets" in data
    assert len(data["buckets"]) == 3
