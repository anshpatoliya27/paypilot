from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class AuditService:
    @staticmethod
    async def log_event(
        db: AsyncSession,
        merchant_id: str,
        actor_type: str, # AGENT, MERCHANT, RAZORPAY_WEBHOOK, SYSTEM
        action: str,
        title: str,
        details: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Record an immutable structured audit log entry.
        """
        entry = AuditLog(
            merchant_id=merchant_id,
            actor_type=actor_type,
            action=action,
            title=title,
            details=details,
            meta_data=metadata or {}
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        logger.info(f"[AUDIT] {actor_type} - {action}: {title}")
        return entry
