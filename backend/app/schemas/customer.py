from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.core.money import paise_to_rupees, rupees_to_paise

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Customer full name")
    email: EmailStr = Field(..., description="Customer email address")
    phone: str = Field(..., min_length=5, max_length=50, description="Customer phone number")
    company_name: Optional[str] = Field(None, max_length=255, description="Company or business name")

class CustomerCreate(CustomerBase):
    outstanding_balance_rupees: Optional[Decimal] = Field(Decimal("0.00"), ge=0, description="Initial outstanding balance in INR")
    risk_category: Optional[str] = Field("LOW", description="Risk category: LOW, MEDIUM, HIGH")

    @field_validator("risk_category")
    @classmethod
    def validate_risk(cls, v: str) -> str:
        if v.upper() not in ["LOW", "MEDIUM", "HIGH"]:
            raise ValueError("risk_category must be LOW, MEDIUM, or HIGH")
        return v.upper()

class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=5, max_length=50)
    company_name: Optional[str] = None
    risk_category: Optional[str] = None

class CustomerResponse(BaseModel):
    id: str
    merchant_id: str
    name: str
    email: str
    phone: str
    company_name: Optional[str] = None
    outstanding_balance_paise: int
    outstanding_balance_rupees: Decimal
    lifetime_value_paise: int
    lifetime_value_rupees: Decimal
    risk_category: str
    failed_payment_count: int
    overdue_days: int
    last_payment_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CustomerPaymentItem(BaseModel):
    id: str
    razorpay_payment_link_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    amount_paise: int
    amount_rupees: Decimal
    status: str
    description: Optional[str] = None
    short_url: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None

class CustomerDetailResponse(BaseModel):
    customer: CustomerResponse
    payments: List[CustomerPaymentItem]
