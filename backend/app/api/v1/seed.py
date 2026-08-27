from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.seed_service import SeedService

router = APIRouter()

@router.post("/scenario")
async def seed_demo_scenario(db: AsyncSession = Depends(get_db)):
    """
    1-Click Demo Reset and Seeding Endpoint.
    """
    res = await SeedService.reset_and_seed_demo_data(db)
    return res
