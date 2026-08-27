from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import Optional, List
from app.models.customer import Customer
from app.repositories.base_repository import BaseRepository

class CustomerRepository(BaseRepository[Customer]):
    def __init__(self, db: AsyncSession):
        super().__init__(Customer, db)

    async def list_by_merchant(
        self,
        merchant_id: str,
        risk_category: Optional[str] = None,
        overdue_only: bool = False,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Customer]:
        query = select(Customer).where(Customer.merchant_id == merchant_id)
        
        if risk_category:
            query = query.where(Customer.risk_category == risk_category.upper())
        if overdue_only:
            query = query.where(Customer.outstanding_balance_paise > 0)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(
                    Customer.name.ilike(pattern),
                    Customer.company_name.ilike(pattern),
                    Customer.email.ilike(pattern)
                )
            )

        query = query.order_by(Customer.outstanding_balance_paise.desc()).limit(limit).offset(offset)
        res = await self.db.execute(query)
        return res.scalars().all()

    async def find_by_name_or_company(self, merchant_id: str, query_str: str) -> Optional[Customer]:
        pattern = f"%{query_str}%"
        stmt = select(Customer).where(
            and_(
                Customer.merchant_id == merchant_id,
                or_(
                    Customer.name.ilike(pattern),
                    Customer.company_name.ilike(pattern),
                    Customer.email.ilike(pattern)
                )
            )
        )
        res = await self.db.execute(stmt)
        return res.scalars().first()
