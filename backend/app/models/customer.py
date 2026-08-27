from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    company_name = Column(String(255), nullable=True)
    outstanding_balance = Column(Float, default=0.0)
    lifetime_value = Column(Float, default=0.0)
    risk_category = Column(String(50), default="LOW") # LOW, MEDIUM, HIGH
    failed_payment_count = Column(Integer, default=0)
    overdue_days = Column(Integer, default=0)
    last_payment_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    merchant = relationship("Merchant", back_populates="customers")
    payment_requests = relationship("PaymentRequest", back_populates="customer", cascade="all, delete-orphan")
