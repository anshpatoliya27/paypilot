import asyncio
from app.core.database import AsyncSessionLocal
from app.services.khushi_sync_service import KhushiSyncService

async def main():
    print("Testing connection check...")
    status = KhushiSyncService.check_connection()
    print("Status:", status)

    print("\nTesting full sync into Neon PostgreSQL...")
    async with AsyncSessionLocal() as session:
        result = await KhushiSyncService.sync_khushi_data(session, wipe_existing=True)
        print("Sync result:", result)

if __name__ == "__main__":
    asyncio.run(main())
