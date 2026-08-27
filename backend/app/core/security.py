import hmac
import hashlib
from typing import Union, Optional
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def verify_razorpay_webhook_signature(
    payload_body: Union[bytes, str],
    signature_header: Optional[str],
    secret: Optional[str] = None
) -> bool:
    """
    Cryptographically verify the Razorpay Webhook signature using HMAC-SHA256.
    Uses timing-safe comparison to prevent timing attacks.
    """
    if not signature_header:
        logger.warning("Webhook signature verification failed: Missing X-Razorpay-Signature header")
        return False
        
    webhook_secret = secret or settings.RAZORPAY_WEBHOOK_SECRET
    if not webhook_secret:
        logger.warning("Webhook signature verification failed: RAZORPAY_WEBHOOK_SECRET not configured")
        return False

    raw_bytes = payload_body.encode('utf-8') if isinstance(payload_body, str) else payload_body

    expected_signature = hmac.new(
        key=webhook_secret.encode('utf-8'),
        msg=raw_bytes,
        digestmod=hashlib.sha256
    ).hexdigest()

    is_valid = hmac.compare_digest(expected_signature, signature_header)
    if not is_valid:
        logger.warning("Webhook signature verification failed: Signature mismatch")
    return is_valid


def generate_webhook_signature(
    payload_body: Union[bytes, str],
    secret: Optional[str] = None
) -> str:
    """
    Generate an HMAC-SHA256 signature for testing and webhook simulation.
    """
    webhook_secret = secret or settings.RAZORPAY_WEBHOOK_SECRET
    raw_bytes = payload_body.encode('utf-8') if isinstance(payload_body, str) else payload_body
    return hmac.new(
        key=webhook_secret.encode('utf-8'),
        msg=raw_bytes,
        digestmod=hashlib.sha256
    ).hexdigest()
