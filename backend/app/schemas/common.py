from pydantic import BaseModel, Field
from typing import Optional, Any, Dict

class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "paypilot-backend"
    version: str = "1.0.0"

class ReadinessResponse(BaseModel):
    status: str = "ok"
    service: str = "paypilot-backend"
    database: str = "healthy"
    version: str = "1.0.0"

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    error: ErrorDetail
