from sqlalchemy import Column, String, DateTime, JSON
import uuid
from datetime import datetime, timezone
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rzp_event_id = Column(String(100), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    status = Column(String(50), default="PROCESSED") # RECEIVED, PROCESSED, IGNORED, FAILED
    raw_payload = Column(JSON, nullable=False)
    
    received_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
