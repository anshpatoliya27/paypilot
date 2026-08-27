from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.customer import Customer
from app.models.payment_request import PaymentRequest

router = APIRouter()

class CustomerResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    company_name: Optional[str]
    outstanding_balance: float
    lifetime_value: float
    risk_category: str
    failed_payment_count: int
    overdue_days: int
    last_payment_date: Optional[str]

    class Config:
        from_attributes = True

@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    risk_category: Optional[str] = None,
    overdue_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    query = select(Customer)
    if risk_category:
        query = query.where(Customer.risk_category == risk_category.upper())
    if overdue_only:
        query = query.where(Customer.outstanding_balance > 0)
    query = query.order_by(Customer.outstanding_balance.desc())
    
    result = await db.execute(query)
    customers = result.scalars().all()
    
    return [
        CustomerResponse(
            id=c.id,
            name=c.name,
            email=c.email,
            phone=c.phone,
            company_name=c.company_name,
            outstanding_balance=float(c.outstanding_balance),
            lifetime_value=float(c.lifetime_value),
            risk_category=c.risk_category,
            failed_payment_count=c.failed_payment_count,
            overdue_days=c.overdue_days,
            last_payment_date=c.last_payment_date.isoformat() if c.last_payment_date else None
        )
        for c in customers
    ]

@router.get("/{customer_id}")
async def get_customer_detail(customer_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Customer).where(Customer.id == customer_id)
    res = await db.execute(stmt)
    customer = res.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Fetch transaction history
    pay_stmt = select(PaymentRequest).where(PaymentRequest.customer_id == customer_id).order_by(PaymentRequest.created_at.desc())
    pay_res = await db.execute(pay_stmt)
    payments = pay_res.scalars().all()

    return {
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "company_name": customer.company_name,
            "outstanding_balance": float(customer.outstanding_balance),
            "lifetime_value": float(customer.lifetime_value),
            "risk_category": customer.risk_category,
            "failed_payment_count": customer.failed_payment_count,
            "overdue_days": customer.overdue_days,
            "last_payment_date": customer.last_payment_date.isoformat() if customer.last_payment_date else None
        },
        "payments": [
            {
                "id": p.id,
                "amount": float(p.amount),
                "status": p.status,
                "description": p.description,
                "short_url": p.short_url,
                "rzp_payment_link_id": p.rzp_payment_link_id,
                "rzp_payment_id": p.rzp_payment_id,
                "failure_reason": p.failure_reason,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "paid_at": p.paid_at.isoformat() if p.paid_at else None
            }
            for p in payments
        ]
    }
