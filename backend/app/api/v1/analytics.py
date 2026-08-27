from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.repositories.merchant_repository import MerchantRepository
from app.services.revenue_service import RevenueService
from app.schemas.revenue import RevenueOverviewResponse, AgingBreakdownResponse

router = APIRouter()

@router.get("/overview", response_model=RevenueOverviewResponse)
async def get_overview(db: AsyncSession = Depends(get_db)):
    merchant_repo = MerchantRepository(db)
    merchant = await merchant_repo.get_or_create_default()
    metrics = await RevenueService.get_overview_metrics(db, merchant.id)
    return metrics

@router.get("/overdue", response_model=AgingBreakdownResponse)
async def get_overdue_aging(db: AsyncSession = Depends(get_db)):
    merchant_repo = MerchantRepository(db)
    merchant = await merchant_repo.get_or_create_default()
    aging_data = await RevenueService.get_aging_buckets(db, merchant.id)
    return aging_data
