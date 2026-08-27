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
    merchant_id = Column(String(36), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    action_type = Column(String(100), nullable=False) # CREATE_PAYMENT_LINK, RECOVERY_CAMPAIGN, CANCEL_LINK
    risk_level = Column(String(50), default="MEDIUM", nullable=False) # LOW, MEDIUM, HIGH
    status = Column(String(50), default="PENDING", nullable=False, index=True) # PENDING, APPROVED, REJECTED, EXECUTED, FAILED
    
    title = Column(String(255), nullable=False)
    agent_reasoning = Column(Text, nullable=False)
    payload = Column(JSON, nullable=False) # Staged execution parameters
    execution_result = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    merchant = relationship("Merchant", back_populates="approvals")

    def __repr__(self):
        return f"<Approval id={self.id} action='{self.action_type}' status='{self.status}'>"
