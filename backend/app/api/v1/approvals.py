from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any
from pydantic import BaseModel

from app.core.database import get_db
from app.services.approval_service import ApprovalService

router = APIRouter()

class ResolveApprovalRequest(BaseModel):
    action: str # "APPROVE" or "REJECT"
    modified_payload: Optional[Dict[str, Any]] = None

@router.get("")
async def list_approvals(status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    merchant_id = "merchant_demo_apex_01"
    approvals = await ApprovalService.list_approvals(db, merchant_id, status=status)
    return [
        {
            "id": a.id,
            "action_type": a.action_type,
            "risk_level": a.risk_level,
            "status": a.status,
            "title": a.title,
            "agent_reasoning": a.agent_reasoning,
            "payload": a.payload,
            "execution_result": a.execution_result,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None
        }
        for a in approvals
    ]

@router.post("/{approval_id}/action")
async def resolve_approval_endpoint(
    approval_id: str,
    req: ResolveApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    merchant_id = "merchant_demo_apex_01"
    try:
        res = await ApprovalService.resolve_approval(
            db=db,
            merchant_id=merchant_id,
            approval_id=approval_id,
            action=req.action,
            modified_payload=req.modified_payload
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
