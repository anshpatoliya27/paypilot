from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from app.core.money import paise_to_rupees

class PaymentLinkCreate(BaseModel):
    customer_id: Optional[str] = Field(None, description="Existing customer ID")
    customer_name: Optional[str] = Field(None, min_length=1, max_length=255)
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = Field(None, min_length=5, max_length=50)
    
    amount_rupees: Decimal = Field(..., gt=0, description="Payment amount in Indian Rupees (e.g. 25000.00)")
    description: str = Field(..., min_length=1, max_length=500, description="Invoice or payment description")
    expire_in_hours: int = Field(default=48, ge=1, le=720, description="Link expiration in hours (1-720)")
    
    notify_sms: bool = Field(default=True, description="Enable Razorpay SMS notification")
    notify_email: bool = Field(default=True, description="Enable Razorpay Email notification")
    reminder_enable: bool = Field(default=True, description="Enable Razorpay automated reminder schedules")

    @field_validator("amount_rupees")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0"):
            raise ValueError("Amount must be greater than 0")
        if v > Decimal("10000000"): # 1 Crore max check
            raise ValueError("Amount exceeds maximum allowed transaction threshold")
        return v.quantize(Decimal("0.01"))

class PaymentLinkResponse(BaseModel):
    id: str
    merchant_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    
    razorpay_payment_link_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    
    amount_paise: int
    amount_rupees: Decimal
    currency: str = "INR"
    status: str
    description: Optional[str] = None
    short_url: Optional[str] = None
    
    notify_sms: bool
    notify_email: bool
    
    expires_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    
    meta_data: Dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentSyncResponse(BaseModel):
    success: bool
    id: str
    razorpay_payment_link_id: Optional[str] = None
    status: str
    amount_rupees: Decimal
    amount_paise: int
