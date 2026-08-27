from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.revenue_service import RevenueService

router = APIRouter()

@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    merchant_id = "merchant_demo_apex_01"
    metrics = await RevenueService.get_overview_metrics(db, merchant_id)
    return metrics

@router.get("/overdue")
async def get_overdue_aging(db: AsyncSession = Depends(get_db)):
    merchant_id = "merchant_demo_apex_01"
    aging_data = await RevenueService.get_aging_buckets(db, merchant_id)
    return aging_data
