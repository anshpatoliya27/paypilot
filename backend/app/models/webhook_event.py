from sqlalchemy import Column, String, DateTime, JSON
import uuid
from datetime import datetime, timezone
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    razorpay_event_id = Column(String(100), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    status = Column(String(50), default="PROCESSED", nullable=False) # RECEIVED, PROCESSED, IGNORED, FAILED
    raw_payload = Column(JSON, nullable=False)
    
    received_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<WebhookEvent id={self.id} rzp_id='{self.razorpay_event_id}' event='{self.event_type}'>"
