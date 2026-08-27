from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class AuditLogResponse(BaseModel):
    id: str
    merchant_id: str
    actor_type: str
    action: str
    title: str
    details: Optional[str] = None
    meta_data: Dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True
