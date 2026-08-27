from fastapi import APIRouter, HTTPException, status
from app.schemas.common import HealthResponse, ReadinessResponse
from app.core.database import check_database_health

router = APIRouter()

@router.get("", response_model=HealthResponse)
async def get_health():
    """
    Liveness probe: verifies that the FastAPI application is running.
    Does not depend on external databases.
    """
    return HealthResponse(
        status="ok",
        service="paypilot-backend",
        version="1.0.0"
    )

@router.get("/ready", response_model=ReadinessResponse)
async def get_readiness():
    """
    Readiness probe: verifies database connectivity.
    """
    is_db_healthy = await check_database_health()
    if not is_db_healthy:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection unhealthy"
        )
    return ReadinessResponse(
        status="ok",
        service="paypilot-backend",
        database="healthy",
        version="1.0.0"
    )
