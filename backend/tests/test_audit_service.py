import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.merchant import Merchant
from app.services.audit_service import AuditService

@pytest.mark.asyncio
async def test_audit_service_event_logging(db_session: AsyncSession, seed_test_merchant: Merchant):
    log_entry = await AuditService.log_event(
        db=db_session,
        merchant_id=seed_test_merchant.id,
        actor_type="SYSTEM",
        action="TEST_ACTION",
        title="Test Event Execution",
        details="Executing integration test event",
        metadata={"test_key": "test_val"}
    )
    assert log_entry.id is not None
    assert log_entry.merchant_id == seed_test_merchant.id
    assert log_entry.actor_type == "SYSTEM"
    assert log_entry.action == "TEST_ACTION"
    assert log_entry.meta_data == {"test_key": "test_val"}
