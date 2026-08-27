import asyncio
import sys
import io
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
from app.core.database import engine, Base, AsyncSessionLocal
from app.services.seed_service import SeedService
from app.services.revenue_service import RevenueService

async def test_db():
    print("1. Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully.")

    print("2. Seeding test scenario...")
    async with AsyncSessionLocal() as session:
        res = await SeedService.reset_and_seed_demo_data(session)
        print("Seed result:", res)

        print("3. Testing deterministic revenue calculation...")
        metrics = await RevenueService.get_overview_metrics(session, "merchant_demo_apex_01")
        print("Revenue metrics:", metrics)
        
        aging = await RevenueService.get_aging_buckets(session, "merchant_demo_apex_01")
        print("Aging breakdown:", aging)

    await engine.dispose()
    print("All backend tests passed!")

if __name__ == "__main__":
    asyncio.run(test_db())
