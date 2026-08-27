from sqlalchemy import Column, String, BigInteger, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from app.core.database import Base
from app.core.money import paise_to_rupees

def generate_uuid():
    return str(uuid.uuid4())

class PaymentRequest(Base):
    __tablename__ = "payment_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Razorpay Resource Identifiers
    razorpay_payment_link_id = Column(String(100), unique=True, nullable=True, index=True)
    razorpay_payment_id = Column(String(100), nullable=True, index=True)
    
    # Financial amount in integer paise
    amount_paise = Column(BigInteger, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(50), default="CREATED", nullable=False, index=True) # CREATED, PENDING, PAID, FAILED, EXPIRED, CANCELLED
    
    description = Column(Text, nullable=True)
    short_url = Column(String(500), nullable=True)
    
    notify_sms = Column(Boolean, default=True, nullable=False)
    notify_email = Column(Boolean, default=True, nullable=False)
    
    expires_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    
    meta_data = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    merchant = relationship("Merchant", back_populates="payment_requests")
    customer = relationship("Customer", back_populates="payment_requests")

    @property
    def amount_rupees(self) -> Decimal:
        return paise_to_rupees(self.amount_paise)

    def __repr__(self):
        return f"<PaymentRequest id={self.id} amount_paise={self.amount_paise} status='{self.status}'>"
