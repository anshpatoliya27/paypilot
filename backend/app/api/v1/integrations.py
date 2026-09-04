from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.khushi_sync_service import KhushiSyncService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/khushi/status")
async def get_khushi_status():
    """
    Checks connection health to Khushi Threads live billing platform
    (https://khushi-threads.vercel.app/).
    """
    try:
        status = KhushiSyncService.check_connection()
        return status
    except Exception as e:
        logger.error(f"Error checking Khushi Threads status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/khushi/sync")
async def trigger_khushi_sync(db: AsyncSession = Depends(get_db)):
    """
    1-Click Live Synchronization: Ingests genuine customers, 54 invoices,
    and ledger history directly from Khushi Threads into PayPilot.
    """
    try:
        result = await KhushiSyncService.sync_khushi_data(db, wipe_existing=True)
        return result
    except Exception as e:
        logger.error(f"Error during Khushi Threads synchronization: {e}")
        raise HTTPException(status_code=500, detail=str(e))
