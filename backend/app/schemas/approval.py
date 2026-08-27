from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class ApprovalResponse(BaseModel):
    id: str
    merchant_id: str
    action_type: str
    risk_level: str
    status: str
    title: str
    agent_reasoning: str
    payload: Dict[str, Any]
    execution_result: Optional[Dict[str, Any]] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ApprovalResolveRequest(BaseModel):
    action: str = Field(..., description="'APPROVE' or 'REJECT'")
    modified_payload: Optional[Dict[str, Any]] = None
