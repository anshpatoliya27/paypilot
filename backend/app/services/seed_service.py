from sqlalchemy.ext.asyncio import AsyncSession
from app.services.khushi_sync_service import KhushiSyncService
import logging

logger = logging.getLogger(__name__)

class SeedService:
    @staticmethod
    async def reset_and_seed_demo_data(db: AsyncSession) -> dict:
        """
        Wipes existing data and seeds 100% genuine production data from Khushi Threads
        (https://khushi-threads.vercel.app/).
        Zero dummy data: authentic customers, 54 invoices, challan IDs, and ledger entries.
        """
        logger.info("Seeding production data from Khushi Threads...")
        return await KhushiSyncService.sync_khushi_data(db, wipe_existing=True)
