from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.services.seed_service import SeedService
from app.api.v1.router import api_v1_router
from app.schemas.common import ErrorResponse, ErrorDetail

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("paypilot")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing PayPilot backend services...")
    # Initialize database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Auto-seed initial demo fixture if empty
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        from app.models.merchant import Merchant
        res = await session.execute(select(Merchant).filter_by(id="merchant_demo_apex_01"))
        if not res.scalar_one_or_none():
            logger.info("Seeding default demo business data...")
            await SeedService.reset_and_seed_demo_data(session)
        else:
            logger.info("Demo business data already present in database.")
    
    yield
    
    # Clean shutdown
    await engine.dispose()
    logger.info("PayPilot backend shut down cleanly.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Autonomous AI Revenue Agent for Razorpay Ecosystem - Phase 1 Foundation",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Request validation error on {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            error=ErrorDetail(
                code="VALIDATION_ERROR",
                message="Invalid request parameters",
                details={"errors": exc.errors()}
            )
        ).model_dump()
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error=ErrorDetail(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected server error occurred."
            )
        ).model_dump()
    )

# Mount API v1 Router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "app": "PayPilot AI Revenue Operations",
        "phase": "Phase 1 Foundation",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }
