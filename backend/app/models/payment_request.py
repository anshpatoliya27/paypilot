from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class PaymentRequest(Base):
    __tablename__ = "payment_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    
    # Razorpay Resource Identifiers
    rzp_payment_link_id = Column(String(100), unique=True, nullable=True, index=True)
    rzp_payment_id = Column(String(100), nullable=True, index=True)
    
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(50), default="CREATED", index=True) # CREATED, PENDING, PAID, FAILED, EXPIRED, CANCELLED
    description = Column(String(500), nullable=True)
    short_url = Column(String(500), nullable=True)
    
    notify_sms = Column(Boolean, default=True)
    notify_email = Column(Boolean, default=True)
    
    expires_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    failure_reason = Column(String(500), nullable=True)
    
    meta_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    merchant = relationship("Merchant", back_populates="payment_requests")
    customer = relationship("Customer", back_populates="payment_requests")
