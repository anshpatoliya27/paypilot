from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    
    actor_type = Column(String(50), nullable=False) # AGENT, MERCHANT, RAZORPAY_WEBHOOK, SYSTEM
    action = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    meta_data = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    merchant = relationship("Merchant", back_populates="audit_logs")
