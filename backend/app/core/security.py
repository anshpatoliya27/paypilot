import hmac
import hashlib
from app.core.config import settings

def verify_razorpay_webhook_signature(payload_body: bytes, signature_header: str, secret: str = None) -> bool:
    """
    Cryptographically verify the Razorpay Webhook signature using HMAC-SHA256.
    Uses timing-safe comparison to prevent timing attacks.
    """
    if not signature_header:
        return False
    webhook_secret = secret or settings.RAZORPAY_WEBHOOK_SECRET
    if not webhook_secret:
        return False
        
    expected_signature = hmac.new(
        key=webhook_secret.encode('utf-8'),
        msg=payload_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected_signature, signature_header)
