import pytest
from app.core.security import verify_razorpay_webhook_signature, generate_webhook_signature

def test_valid_webhook_signature_verification():
    payload_body = b'{"event":"payment_link.paid","id":"evt_test_123"}'
    secret = "test_webhook_secret_key"
    
    signature = generate_webhook_signature(payload_body, secret=secret)
    assert signature is not None
    assert len(signature) == 64 # SHA256 hex digest length

    is_valid = verify_razorpay_webhook_signature(payload_body, signature, secret=secret)
    assert is_valid is True

def test_tampered_payload_fails_signature_verification():
    payload_body = b'{"event":"payment_link.paid","id":"evt_test_123"}'
    tampered_body = b'{"event":"payment_link.paid","id":"evt_test_tampered"}'
    secret = "test_webhook_secret_key"
    
    signature = generate_webhook_signature(payload_body, secret=secret)
    
    # Tampered body with original signature must fail
    is_valid = verify_razorpay_webhook_signature(tampered_body, signature, secret=secret)
    assert is_valid is False

def test_missing_signature_or_secret_fails():
    payload_body = b'{"event":"payment_link.paid"}'
    
    assert verify_razorpay_webhook_signature(payload_body, None, secret="sec") is False
    assert verify_razorpay_webhook_signature(payload_body, "sig", secret="") is False
