from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.core.database import get_db
from app.core.money import rupees_to_paise
from app.models.customer import Customer
from app.repositories.customer_repository import CustomerRepository
from app.repositories.payment_repository import PaymentRepository
from app.repositories.merchant_repository import MerchantRepository
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerDetailResponse, CustomerPaymentItem

router = APIRouter()

@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    risk_category: Optional[str] = Query(None, description="Filter by risk: LOW, MEDIUM, HIGH"),
    overdue_only: bool = Query(False, description="Filter to only customers with positive outstanding balance"),
    search: Optional[str] = Query(None, description="Search by name, company, or email"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    merchant_repo = MerchantRepository(db)
    merchant = await merchant_repo.get_or_create_default()
    
    cust_repo = CustomerRepository(db)
    customers = await cust_repo.list_by_merchant(
        merchant_id=merchant.id,
        risk_category=risk_category,
        overdue_only=overdue_only,
        search=search,
        limit=limit,
        offset=offset
    )
    
    return [
        CustomerResponse(
            id=c.id,
            merchant_id=c.merchant_id,
            name=c.name,
            email=c.email,
            phone=c.phone,
            company_name=c.company_name,
            outstanding_balance_paise=c.outstanding_balance_paise,
            outstanding_balance_rupees=c.outstanding_balance_rupees,
            lifetime_value_paise=c.lifetime_value_paise,
            lifetime_value_rupees=c.lifetime_value_rupees,
            risk_category=c.risk_category,
            failed_payment_count=c.failed_payment_count,
            overdue_days=c.overdue_days,
            last_payment_date=c.last_payment_date,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        for c in customers
    ]

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    db: AsyncSession = Depends(get_db)
):
    merchant_repo = MerchantRepository(db)
    merchant = await merchant_repo.get_or_create_default()
    
    cust_repo = CustomerRepository(db)
    paise_balance = rupees_to_paise(payload.outstanding_balance_rupees or 0)
    
    new_customer = Customer(
        merchant_id=merchant.id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        company_name=payload.company_name,
        outstanding_balance_paise=paise_balance,
        lifetime_value_paise=0,
        risk_category=payload.risk_category or "LOW",
        failed_payment_count=0,
        overdue_days=0
    )
    
    saved = await cust_repo.create(new_customer)
    return CustomerResponse(
        id=saved.id,
        merchant_id=saved.merchant_id,
        name=saved.name,
        email=saved.email,
        phone=saved.phone,
        company_name=saved.company_name,
        outstanding_balance_paise=saved.outstanding_balance_paise,
        outstanding_balance_rupees=saved.outstanding_balance_rupees,
        lifetime_value_paise=saved.lifetime_value_paise,
        lifetime_value_rupees=saved.lifetime_value_rupees,
        risk_category=saved.risk_category,
        failed_payment_count=saved.failed_payment_count,
        overdue_days=saved.overdue_days,
        last_payment_date=saved.last_payment_date,
        created_at=saved.created_at,
        updated_at=saved.updated_at
    )

@router.get("/{customer_id}", response_model=CustomerDetailResponse)
async def get_customer_detail(
    customer_id: str,
    db: AsyncSession = Depends(get_db)
):
    cust_repo = CustomerRepository(db)
    customer = await cust_repo.get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    pay_repo = PaymentRepository(db)
    payments = await pay_repo.list_by_customer(customer_id)

    return CustomerDetailResponse(
        customer=CustomerResponse(
            id=customer.id,
            merchant_id=customer.merchant_id,
            name=customer.name,
            email=customer.email,
            phone=customer.phone,
            company_name=customer.company_name,
            outstanding_balance_paise=customer.outstanding_balance_paise,
            outstanding_balance_rupees=customer.outstanding_balance_rupees,
            lifetime_value_paise=customer.lifetime_value_paise,
            lifetime_value_rupees=customer.lifetime_value_rupees,
            risk_category=customer.risk_category,
            failed_payment_count=customer.failed_payment_count,
            overdue_days=customer.overdue_days,
            last_payment_date=customer.last_payment_date,
            created_at=customer.created_at,
            updated_at=customer.updated_at
        ),
        payments=[
            CustomerPaymentItem(
                id=p.id,
                razorpay_payment_link_id=p.razorpay_payment_link_id,
                razorpay_payment_id=p.razorpay_payment_id,
                amount_paise=p.amount_paise,
                amount_rupees=p.amount_rupees,
                status=p.status,
                description=p.description,
                short_url=p.short_url,
                failure_reason=p.failure_reason,
                created_at=p.created_at,
                paid_at=p.paid_at
            )
            for p in payments
        ]
    )
