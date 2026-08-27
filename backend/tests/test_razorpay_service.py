import pytest
from app.services.razorpay_service import RazorpayService

def test_razorpay_service_initialization_without_keys():
    service = RazorpayService(key_id="rzp_test_placeholder_key", key_secret="rzp_test_placeholder_secret")
    assert service.is_configured is False
    assert service.client is None

def test_razorpay_service_create_payment_link_sandbox_mode():
    service = RazorpayService(key_id="rzp_test_placeholder_key", key_secret="rzp_test_placeholder_secret")
    res = service.create_payment_link(
        amount_paise=2500000, # ₹25,000
        customer_name="Rahul Sharma",
        customer_email="rahul@example.com",
        customer_phone="+919876543210",
        description="Retainer Milestone 1",
        expire_in_hours=48
    )
    assert res["success"] is True
    assert res["amount_paise"] == 2500000
    assert res["status"] == "CREATED"
    assert res["id"].startswith("plink_")
    assert "https://rzp.io/i/" in res["short_url"]

def test_razorpay_service_negative_amount_fails():
    service = RazorpayService()
    with pytest.raises(ValueError, match="must be positive"):
        service.create_payment_link(
            amount_paise=-1000,
            customer_name="A",
            customer_email="a@b.com",
            customer_phone="12345",
            description="Test"
        )
