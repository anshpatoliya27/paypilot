from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict, Any
from app.models.audit_log import AuditLog
from app.repositories.base_repository import BaseRepository

class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, db: AsyncSession):
        super().__init__(AuditLog, db)

    async def list_by_merchant(
        self,
        merchant_id: str,
        actor_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[AuditLog]:
        query = select(AuditLog).where(AuditLog.merchant_id == merchant_id)
        if actor_type:
            query = query.where(AuditLog.actor_type == actor_type.upper())
        query = query.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
        res = await self.db.execute(query)
        return res.scalars().all()
