from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.customers import router as customers_router
from app.api.v1.payments import router as payments_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.approvals import router as approvals_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.audit import router as audit_router
from app.api.v1.seed import router as seed_router
from app.api.v1.agent import router as agent_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router, prefix="/health", tags=["Health"])
api_v1_router.include_router(agent_router, prefix="/agent", tags=["Agent"])
api_v1_router.include_router(customers_router, prefix="/customers", tags=["Customers"])
api_v1_router.include_router(payments_router, prefix="/payments", tags=["Payments"])
api_v1_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
api_v1_router.include_router(approvals_router, prefix="/approvals", tags=["Approvals"])
api_v1_router.include_router(webhooks_router, prefix="/webhooks", tags=["Webhooks"])
api_v1_router.include_router(audit_router, prefix="/audit", tags=["Audit"])
api_v1_router.include_router(seed_router, prefix="/seed", tags=["Seed"])
