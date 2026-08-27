from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, List
from app.models.payment_request import PaymentRequest
from app.repositories.base_repository import BaseRepository

class PaymentRepository(BaseRepository[PaymentRequest]):
    def __init__(self, db: AsyncSession):
        super().__init__(PaymentRequest, db)

    async def get_by_razorpay_link_id(self, rzp_link_id: str) -> Optional[PaymentRequest]:
        stmt = select(PaymentRequest).where(PaymentRequest.razorpay_payment_link_id == rzp_link_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_by_merchant(
        self,
        merchant_id: str,
        status: Optional[str] = None,
        customer_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[PaymentRequest]:
        query = select(PaymentRequest).where(PaymentRequest.merchant_id == merchant_id)
        
        if status:
            query = query.where(PaymentRequest.status == status.upper())
        if customer_id:
            query = query.where(PaymentRequest.customer_id == customer_id)

        query = query.order_by(PaymentRequest.created_at.desc()).limit(limit).offset(offset)
        res = await self.db.execute(query)
        return res.scalars().all()

    async def list_by_customer(self, customer_id: str) -> List[PaymentRequest]:
        stmt = select(PaymentRequest).where(PaymentRequest.customer_id == customer_id).order_by(PaymentRequest.created_at.desc())
        res = await self.db.execute(stmt)
        return res.scalars().all()
