from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.core.database import get_db
from app.models.audit_log import AuditLog

router = APIRouter()

@router.get("/logs")
async def get_audit_logs(actor: Optional[str] = None, limit: int = 50, db: AsyncSession = Depends(get_db)):
    merchant_id = "merchant_demo_apex_01"
    query = select(AuditLog).where(AuditLog.merchant_id == merchant_id)
    if actor:
        query = query.where(AuditLog.actor_type == actor.upper())
    query = query.order_by(AuditLog.created_at.desc()).limit(limit)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return [
        {
            "id": l.id,
            "actor_type": l.actor_type,
            "action": l.action,
            "title": l.title,
            "details": l.details,
            "meta_data": l.meta_data,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ]
