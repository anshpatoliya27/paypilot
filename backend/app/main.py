from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.services.seed_service import SeedService

# Import API routers
from app.api.v1.agent import router as agent_router
from app.api.v1.customers import router as customers_router
from app.api.v1.payments import router as payments_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.approvals import router as approvals_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.audit import router as audit_router
from app.api.v1.seed import router as seed_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("paypilot")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and auto-seed if empty
    logger.info("Initializing PayPilot database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Auto seed initial scenario
    async with AsyncSessionLocal() as session:
        logger.info("Seeding default demo business data...")
        await SeedService.reset_and_seed_demo_data(session)
    
    yield
    
    # Shutdown
    await engine.dispose()
    logger.info("PayPilot backend shut down cleanly.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Autonomous AI Revenue Agent for Razorpay Ecosystem - Razorpay Buildathon 2026",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(agent_router, prefix="/api/v1/agent", tags=["Agent"])
app.include_router(customers_router, prefix="/api/v1/customers", tags=["Customers"])
app.include_router(payments_router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(approvals_router, prefix="/api/v1/approvals", tags=["Approvals"])
app.include_router(webhooks_router, prefix="/api/v1/webhooks", tags=["Webhooks"])
app.include_router(audit_router, prefix="/api/v1/audit", tags=["Audit"])
app.include_router(seed_router, prefix="/api/v1/seed", tags=["Seed"])

@app.get("/")
async def root():
    return {
        "app": "PayPilot AI Revenue Agent",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }
