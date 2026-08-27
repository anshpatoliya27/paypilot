from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from decimal import Decimal

class WebhookResponse(BaseModel):
    status: str
    message: str
    event_id: str
    event_type: str
    reconciliation: Optional[Dict[str, Any]] = None

class WebhookSimulationRequest(BaseModel):
    customer_id: Optional[str] = Field(None, description="Customer ID to target for simulation")
    amount_rupees: Decimal = Field(..., gt=0, description="Amount in INR to simulate (e.g. 42000.00)")
    event_type: str = Field(default="payment_link.paid", description="Event type: payment_link.paid, payment.failed, payment_link.expired")
    failure_code: Optional[str] = Field(default="BAD_REQUEST_ERROR", description="Failure code if simulating failure")
    failure_description: Optional[str] = Field(default="Customer bank server timed out during OTP verification", description="Failure reason")

class WebhookSimulationResponse(BaseModel):
    success: bool
    status: str
    message: str
    event_id: str
    event_type: str
    signature: str
    reconciliation: Optional[Dict[str, Any]] = None
