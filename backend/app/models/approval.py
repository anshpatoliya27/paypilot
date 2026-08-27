from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    
    action_type = Column(String(100), nullable=False) # CREATE_PAYMENT_LINK, RECOVERY_CAMPAIGN, RESEND_REMINDER, CANCEL_LINK
    risk_level = Column(String(50), default="MEDIUM") # LOW, MEDIUM, HIGH
    status = Column(String(50), default="PENDING", index=True) # PENDING, APPROVED, REJECTED, EXECUTED, FAILED
    
    title = Column(String(255), nullable=False)
    agent_reasoning = Column(Text, nullable=False)
    payload = Column(JSON, nullable=False) # Staged execution parameters
    execution_result = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    merchant = relationship("Merchant", back_populates="approvals")
