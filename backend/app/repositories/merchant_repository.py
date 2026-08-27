from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.models.merchant import Merchant
from app.repositories.base_repository import BaseRepository

class MerchantRepository(BaseRepository[Merchant]):
    def __init__(self, db: AsyncSession):
        super().__init__(Merchant, db)

    async def get_by_email(self, email: str) -> Optional[Merchant]:
        stmt = select(Merchant).where(Merchant.email == email)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_or_create_default(self) -> Merchant:
        stmt = select(Merchant).limit(1)
        res = await self.db.execute(stmt)
        merchant = res.scalar_one_or_none()
        if not merchant:
            merchant = Merchant(
                id="merchant_demo_apex_01",
                name="Rohan Patel",
                email="rohan@apexstudios.in",
                business_name="Apex Creative & Tech Studios",
                currency="INR"
            )
            self.db.add(merchant)
            await self.db.commit()
            await self.db.refresh(merchant)
        return merchant
