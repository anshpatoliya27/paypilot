from sqlalchemy import Column, String, BigInteger, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from app.core.database import Base
from app.core.money import paise_to_rupees

def generate_uuid():
    return str(uuid.uuid4())

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=False)
    company_name = Column(String(255), nullable=True)
    
    # Financial fields in integer paise
    outstanding_balance_paise = Column(BigInteger, default=0, nullable=False)
    lifetime_value_paise = Column(BigInteger, default=0, nullable=False)
    
    risk_category = Column(String(50), default="LOW", nullable=False, index=True) # LOW, MEDIUM, HIGH
    failed_payment_count = Column(Integer, default=0, nullable=False)
    overdue_days = Column(Integer, default=0, nullable=False, index=True)
    last_payment_date = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    merchant = relationship("Merchant", back_populates="customers")
    payment_requests = relationship("PaymentRequest", back_populates="customer", cascade="all, delete-orphan")

    @property
    def outstanding_balance_rupees(self) -> Decimal:
        return paise_to_rupees(self.outstanding_balance_paise)

    @property
    def lifetime_value_rupees(self) -> Decimal:
        return paise_to_rupees(self.lifetime_value_paise)

    def __repr__(self):
        return f"<Customer id={self.id} name='{self.name}' company='{self.company_name}'>"
