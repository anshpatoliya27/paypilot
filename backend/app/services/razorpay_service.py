import razorpay
import razorpay.errors
import time
import uuid
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.core.config import settings

logger = logging.getLogger(__name__)

class RazorpayServiceException(Exception):
    """Base exception for Razorpay Service operations."""
    def __init__(self, message: str, code: str = "RAZORPAY_ERROR", raw_error: Optional[Any] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.raw_error = raw_error

class RazorpayService:
    def __init__(self, key_id: Optional[str] = None, key_secret: Optional[str] = None):
        self.key_id = key_id or settings.RAZORPAY_KEY_ID
        self.key_secret = key_secret or settings.RAZORPAY_KEY_SECRET
        
        self.is_configured = (
            bool(self.key_id) and 
            bool(self.key_secret) and 
            not self.key_id.startswith("rzp_test_placeholder")
        )
        
        self.client = None
        if self.is_configured:
            try:
                self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
                self.client.set_app_details({"title": "PayPilot", "version": "1.0.0"})
                logger.info("Official Razorpay Client initialized in Test/Live mode.")
            except Exception as e:
                logger.warning(f"Failed to initialize official Razorpay Client: {e}. Falling back to sandbox simulator.")
                self.client = None
                self.is_configured = False

    # -------------------------------------------------------------
    # 1. Customer Operations (Official Razorpay /v1/customers)
    # -------------------------------------------------------------
    def create_customer(
        self,
        name: str,
        email: str,
        contact: str,
        notes: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a customer on Razorpay rails.
        Official SDK Method: client.customer.create(...)
        """
        phone_formatted = contact if contact.startswith("+") else f"+91{contact}"
        payload = {
            "name": name,
            "email": email,
            "contact": phone_formatted,
            "notes": notes or {"source": "PayPilot AI"}
        }

        if self.is_configured and self.client:
            try:
                logger.info(f"Calling Razorpay API: POST /v1/customers for {email}")
                response = self.client.customer.create(payload)
                return {
                    "success": True,
                    "id": response.get("id"),
                    "name": response.get("name"),
                    "email": response.get("email"),
                    "contact": response.get("contact"),
                    "raw_response": response
                }
            except razorpay.errors.BadRequestError as e:
                logger.error(f"Razorpay BadRequestError creating customer: {e}")
                raise RazorpayServiceException(f"Razorpay Bad Request: {str(e)}", code="BAD_REQUEST", raw_error=e)
            except Exception as e:
                logger.error(f"Razorpay API error creating customer: {e}")
                raise RazorpayServiceException(f"Failed to create customer on Razorpay: {str(e)}", code="API_ERROR", raw_error=e)

        # Sandbox Simulator Fallback
        mock_id = f"cust_{uuid.uuid4().hex[:14]}"
        return {
            "success": True,
            "id": mock_id,
            "name": name,
            "email": email,
            "contact": phone_formatted,
            "raw_response": {
                "id": mock_id,
                "entity": "customer",
                "name": name,
                "email": email,
                "contact": phone_formatted,
                "created_at": int(time.time())
            }
        }

    def fetch_customer(self, customer_id: str) -> Dict[str, Any]:
        """
        Fetch customer details by Razorpay customer ID.
        Official SDK Method: client.customer.fetch(customer_id)
        """
        if self.is_configured and self.client:
            try:
                response = self.client.customer.fetch(customer_id)
                return {
                    "success": True,
                    "id": response.get("id"),
                    "name": response.get("name"),
                    "email": response.get("email"),
                    "contact": response.get("contact"),
                    "raw_response": response
                }
            except Exception as e:
                logger.error(f"Failed to fetch Razorpay customer {customer_id}: {e}")
                raise RazorpayServiceException(f"Failed to fetch customer: {str(e)}", code="FETCH_FAILED", raw_error=e)

        return {
            "success": True,
            "id": customer_id,
            "name": "Simulated Customer",
            "email": "simulated@example.com",
            "contact": "+919876543210"
        }

    # -------------------------------------------------------------
    # 2. Payment Link Operations (Official Razorpay /v1/payment_links)
    # -------------------------------------------------------------
    def create_payment_link(
        self,
        amount_paise: int,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        description: str,
        expire_in_hours: int = 48,
        notify_sms: bool = True,
        notify_email: bool = True,
        reminder_enable: bool = True,
        notes: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create an official Razorpay Payment Link (/v1/payment_links).
        Amount is strictly in integer paise (1 INR = 100 paise).
        Official SDK Method: client.payment_link.create(...)
        """
        if amount_paise <= 0:
            raise ValueError("Amount in paise must be positive")

        expire_timestamp = int(time.time()) + (expire_in_hours * 3600)
        phone_formatted = customer_phone if customer_phone.startswith("+") else f"+91{customer_phone}"

        payload = {
            "amount": int(amount_paise),
            "currency": "INR",
            "accept_partial": False,
            "description": description or f"Payment request for {customer_name}",
            "customer": {
                "name": customer_name,
                "email": customer_email,
                "contact": phone_formatted
            },
            "notify": {
                "sms": notify_sms,
                "email": notify_email
            },
            "reminder_enable": reminder_enable,
            "notes": notes or {"source": "PayPilot AI Revenue Operations"},
            "expire_by": expire_timestamp
        }

        if self.is_configured and self.client:
            try:
                logger.info(f"Calling Razorpay API: POST /v1/payment_links for {customer_name}, paise={amount_paise}")
                response = self.client.payment_link.create(payload)
                return {
                    "success": True,
                    "id": response.get("id"),
                    "short_url": response.get("short_url"),
                    "amount_paise": amount_paise,
                    "status": response.get("status", "created").upper(),
                    "expires_at": datetime.fromtimestamp(expire_timestamp, tz=timezone.utc).isoformat(),
                    "raw_response": response
                }
            except razorpay.errors.BadRequestError as e:
                logger.error(f"Razorpay BadRequestError creating payment link: {e}")
                raise RazorpayServiceException(f"Razorpay Bad Request: {str(e)}", code="BAD_REQUEST", raw_error=e)
            except Exception as e:
                logger.error(f"Razorpay API invocation error: {e}")
                raise RazorpayServiceException(f"Razorpay API Error: {str(e)}", code="API_ERROR", raw_error=e)

        # Sandbox Simulator Generator
        mock_id = f"plink_{uuid.uuid4().hex[:14]}"
        mock_short_url = f"https://rzp.io/i/{uuid.uuid4().hex[:8]}"
        return {
            "success": True,
            "id": mock_id,
            "short_url": mock_short_url,
            "amount_paise": amount_paise,
            "status": "CREATED",
            "expires_at": datetime.fromtimestamp(expire_timestamp, tz=timezone.utc).isoformat(),
            "raw_response": {
                "id": mock_id,
                "entity": "payment_link",
                "short_url": mock_short_url,
                "amount": amount_paise,
                "currency": "INR",
                "status": "created",
                "description": description,
                "customer": payload["customer"],
                "expire_by": expire_timestamp
            }
        }

    def fetch_payment_link(self, payment_link_id: str) -> Dict[str, Any]:
        """
        Fetch status and details of a Razorpay Payment Link.
        Official SDK Method: client.payment_link.fetch(payment_link_id)
        """
        if self.is_configured and self.client:
            try:
                response = self.client.payment_link.fetch(payment_link_id)
                return {
                    "success": True,
                    "id": response.get("id"),
                    "status": response.get("status", "created").upper(),
                    "amount_paise": response.get("amount", 0),
                    "amount_paid_paise": response.get("amount_paid", 0),
                    "payments": response.get("payments", []),
                    "raw_response": response
                }
            except Exception as e:
                logger.error(f"Failed to fetch payment link {payment_link_id}: {e}")
                raise RazorpayServiceException(f"Failed to fetch payment link: {str(e)}", code="FETCH_FAILED", raw_error=e)

        return {
            "success": True,
            "id": payment_link_id,
            "status": "CREATED",
            "amount_paid_paise": 0,
            "payments": []
        }

    def cancel_payment_link(self, payment_link_id: str) -> Dict[str, Any]:
        """
        Cancel an active Razorpay Payment Link.
        Official SDK Method: client.payment_link.cancel(payment_link_id)
        """
        if self.is_configured and self.client:
            try:
                logger.info(f"Calling Razorpay API: POST /v1/payment_links/{payment_link_id}/cancel")
                response = self.client.payment_link.cancel(payment_link_id)
                return {
                    "success": True,
                    "id": payment_link_id,
                    "status": "CANCELLED",
                    "raw_response": response
                }
            except Exception as e:
                logger.error(f"Failed to cancel payment link {payment_link_id}: {e}")
                raise RazorpayServiceException(f"Failed to cancel payment link: {str(e)}", code="CANCEL_FAILED", raw_error=e)

        return {"success": True, "id": payment_link_id, "status": "CANCELLED"}

    # -------------------------------------------------------------
    # 3. Payment Operations (Official Razorpay /v1/payments)
    # -------------------------------------------------------------
    def fetch_payment(self, payment_id: str) -> Dict[str, Any]:
        """
        Fetch details for a specific payment ID.
        Official SDK Method: client.payment.fetch(payment_id)
        """
        if self.is_configured and self.client:
            try:
                response = self.client.payment.fetch(payment_id)
                return {
                    "success": True,
                    "id": response.get("id"),
                    "status": response.get("status"),
                    "method": response.get("method"),
                    "amount_paise": response.get("amount", 0),
                    "error_code": response.get("error_code"),
                    "error_description": response.get("error_description"),
                    "raw_response": response
                }
            except Exception as e:
                logger.error(f"Failed to fetch payment {payment_id}: {e}")
                raise RazorpayServiceException(f"Failed to fetch payment: {str(e)}", code="FETCH_FAILED", raw_error=e)

        return {
            "success": True,
            "id": payment_id,
            "status": "captured",
            "method": "upi",
            "amount_paise": 0
        }

# Global singleton instance
razorpay_service = RazorpayService()
