from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from app.core.database import get_db
from app.core.money import rupees_to_paise, paise_to_rupees
from app.models.payment_request import PaymentRequest
from app.repositories.payment_repository import PaymentRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.merchant_repository import MerchantRepository
from app.services.razorpay_service import razorpay_service
from app.services.audit_service import AuditService
from app.schemas.payment import PaymentLinkCreate, PaymentLinkResponse, PaymentSyncResponse

router = APIRouter()

@router.get("/links", response_model=List[PaymentLinkResponse])
async def list_payment_links(
    status: Optional[str] = Query(None, description="Filter by status: CREATED, PENDING, PAID, FAILED, EXPIRED, CANCELLED"),
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    merchant_repo = MerchantRepository(db)
    merchant = await merchant_repo.get_or_create_default()
    
    pay_repo = PaymentRepository(db)
    cust_repo = CustomerRepository(db)
    
    links = await pay_repo.list_by_merchant(
        merchant_id=merchant.id,
        status=status,
        customer_id=customer_id,
        limit=limit,
        offset=offset
    )

    output = []
    for l in links:
        cust_name = None
        cust_email = None
        if l.customer_id:
            cust = await cust_repo.get_by_id(l.customer_id)
            if cust:
                cust_name = cust.name
                cust_email = cust.email

        output.append(
            PaymentLinkResponse(
                id=l.id,
                merchant_id=l.merchant_id,
                customer_id=l.customer_id,
                customer_name=cust_name,
                customer_email=cust_email,
                razorpay_payment_link_id=l.razorpay_payment_link_id,
                razorpay_payment_id=l.razorpay_payment_id,
                amount_paise=l.amount_paise,
                amount_rupees=l.amount_rupees,
                currency=l.currency,
                status=l.status,
                description=l.description,
                short_url=l.short_url,
                notify_sms=l.notify_sms,
                notify_email=l.notify_email,
                expires_at=l.expires_at,
                paid_at=l.paid_at,
                failure_reason=l.failure_reason,
                meta_data=l.meta_data or {},
                created_at=l.created_at
            )
        )
    return output

@router.post("/links", response_model=PaymentLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_link(
    payload: PaymentLinkCreate,
    db: AsyncSession = Depends(get_db)
):
    merchant_repo = MerchantRepository(db)
    merchant = await merchant_repo.get_or_create_default()
    
    cust_repo = CustomerRepository(db)
    pay_repo = PaymentRepository(db)

    # 1. Resolve customer contact details
    customer = None
    if payload.customer_id:
        customer = await cust_repo.get_by_id(payload.customer_id)
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified customer_id not found")

    cust_name = customer.name if customer else (payload.customer_name or "Valued Client")
    cust_email = customer.email if customer else (payload.customer_email or "client@example.com")
    cust_phone = customer.phone if customer else (payload.customer_phone or "+919876543210")

    # 2. Convert Rupees to Integer Paise deterministically
    amount_paise = rupees_to_paise(payload.amount_rupees)

    # 3. Call Razorpay Service
    rzp_res = razorpay_service.create_payment_link(
        amount_paise=amount_paise,
        customer_name=cust_name,
        customer_email=str(cust_email),
        customer_phone=cust_phone,
        description=payload.description,
        expire_in_hours=payload.expire_in_hours,
        notify_sms=payload.notify_sms,
        notify_email=payload.notify_email,
        reminder_enable=payload.reminder_enable
    )

    expires_at_dt = None
    if rzp_res.get("expires_at"):
        try:
            expires_at_dt = datetime.fromisoformat(rzp_res["expires_at"].replace("Z", "+00:00"))
        except Exception:
            expires_at_dt = datetime.now(timezone.utc) + timedelta(hours=payload.expire_in_hours)

    # 4. Save PaymentRequest in DB
    new_payment = PaymentRequest(
        merchant_id=merchant.id,
        customer_id=customer.id if customer else None,
        razorpay_payment_link_id=rzp_res.get("id"),
        amount_paise=amount_paise,
        currency="INR",
        status=rzp_res.get("status", "CREATED"),
        description=payload.description,
        short_url=rzp_res.get("short_url"),
        notify_sms=payload.notify_sms,
        notify_email=payload.notify_email,
        expires_at=expires_at_dt,
        meta_data={"source": "api_v1", "razorpay_response": rzp_res.get("raw_response")}
    )

    saved = await pay_repo.create(new_payment)

    # 5. Log immutable audit trail
    await AuditService.log_event(
        db=db,
        merchant_id=merchant.id,
        actor_type="MERCHANT",
        action="PAYMENT_LINK_CREATED",
        title=f"Created Razorpay Payment Link for ₹{payload.amount_rupees:,.2f} ({cust_name})",
        details=f"Payment Link ID: {rzp_res.get('id')} | Short URL: {rzp_res.get('short_url')}",
        metadata={"link_id": rzp_res.get("id"), "amount_paise": amount_paise}
    )

    return PaymentLinkResponse(
        id=saved.id,
        merchant_id=saved.merchant_id,
        customer_id=saved.customer_id,
        customer_name=cust_name,
        customer_email=str(cust_email),
        razorpay_payment_link_id=saved.razorpay_payment_link_id,
        razorpay_payment_id=saved.razorpay_payment_id,
        amount_paise=saved.amount_paise,
        amount_rupees=saved.amount_rupees,
        currency=saved.currency,
        status=saved.status,
        description=saved.description,
        short_url=saved.short_url,
        notify_sms=saved.notify_sms,
        notify_email=saved.notify_email,
        expires_at=saved.expires_at,
        paid_at=saved.paid_at,
        failure_reason=saved.failure_reason,
        meta_data=saved.meta_data or {},
        created_at=saved.created_at
    )

@router.post("/links/{link_id}/sync", response_model=PaymentSyncResponse)
async def sync_payment_link(
    link_id: str,
    db: AsyncSession = Depends(get_db)
):
    pay_repo = PaymentRepository(db)
    payment_req = await pay_repo.get_by_id(link_id)
    if not payment_req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment link not found")

    if payment_req.razorpay_payment_link_id:
        rzp_data = razorpay_service.fetch_payment_link(payment_req.razorpay_payment_link_id)
        if rzp_data.get("status"):
            payment_req.status = rzp_data.get("status").upper()
            if payment_req.status == "PAID" and not payment_req.paid_at:
                payment_req.paid_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(payment_req)

    return PaymentSyncResponse(
        success=True,
        id=payment_req.id,
        razorpay_payment_link_id=payment_req.razorpay_payment_link_id,
        status=payment_req.status,
        amount_rupees=payment_req.amount_rupees,
        amount_paise=payment_req.amount_paise
    )
