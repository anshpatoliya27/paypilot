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
    merchant_id = Column(String(36), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    actor_type = Column(String(50), nullable=False) # AGENT, MERCHANT, RAZORPAY_WEBHOOK, SYSTEM
    action = Column(String(100), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    meta_data = Column(JSON, default=dict, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    merchant = relationship("Merchant", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog id={self.id} actor='{self.actor_type}' action='{self.action}'>"
