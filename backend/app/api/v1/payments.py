from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.models.payment_request import PaymentRequest
from app.models.customer import Customer
from app.services.razorpay_service import razorpay_service
from app.services.audit_service import AuditService

router = APIRouter()

class CreatePaymentLinkRequest(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    amount: float
    description: str
    expire_in_hours: int = 48
    notify_sms: bool = True
    notify_email: bool = True

@router.get("/links")
async def list_payment_links(status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(PaymentRequest).order_by(PaymentRequest.created_at.desc())
    if status:
        query = query.where(PaymentRequest.status == status.upper())
    
    result = await db.execute(query)
    links = result.scalars().all()
    
    # Enrich with customer name
    output = []
    for l in links:
        cust_name = "Unknown"
        cust_email = ""
        if l.customer_id:
            cust_stmt = select(Customer).where(Customer.id == l.customer_id)
            c_res = await db.execute(cust_stmt)
            cust = c_res.scalar_one_or_none()
            if cust:
                cust_name = cust.name
                cust_email = cust.email

        output.append({
            "id": l.id,
            "rzp_payment_link_id": l.rzp_payment_link_id,
            "rzp_payment_id": l.rzp_payment_id,
            "customer_id": l.customer_id,
            "customer_name": cust_name,
            "customer_email": cust_email,
            "amount": float(l.amount),
            "currency": l.currency,
            "status": l.status,
            "description": l.description,
            "short_url": l.short_url,
            "notify_sms": l.notify_sms,
            "notify_email": l.notify_email,
            "expires_at": l.expires_at.isoformat() if l.expires_at else None,
            "paid_at": l.paid_at.isoformat() if l.paid_at else None,
            "failure_reason": l.failure_reason,
            "created_at": l.created_at.isoformat() if l.created_at else None
        })
    return output

@router.post("/links")
async def create_payment_link_direct(req: CreatePaymentLinkRequest, db: AsyncSession = Depends(get_db)):
    merchant_id = "merchant_demo_apex_01"
    cust_name = req.customer_name or "Valued Client"
    cust_email = req.customer_email or "client@example.com"
    cust_phone = req.customer_phone or "+919876543210"
    
    if req.customer_id:
        c_stmt = select(Customer).where(Customer.id == req.customer_id)
        c_res = await db.execute(c_stmt)
        customer = c_res.scalar_one_or_none()
        if customer:
            cust_name = customer.name
            cust_email = customer.email
            cust_phone = customer.phone

    rzp_res = razorpay_service.create_payment_link(
        amount_rupees=req.amount,
        customer_name=cust_name,
        customer_email=cust_email,
        customer_phone=cust_phone,
        description=req.description,
        expire_in_hours=req.expire_in_hours,
        notify_sms=req.notify_sms,
        notify_email=req.notify_email,
        reminder_enable=True
    )

    expires_at_dt = datetime.now(timezone.utc) + timedelta(hours=req.expire_in_hours)

    payment_req = PaymentRequest(
        merchant_id=merchant_id,
        customer_id=req.customer_id,
        rzp_payment_link_id=rzp_res.get("id"),
        amount=req.amount,
        status="CREATED",
        description=req.description,
        short_url=rzp_res.get("short_url"),
        notify_sms=req.notify_sms,
        notify_email=req.notify_email,
        expires_at=expires_at_dt,
        meta_data={"source": "direct_api", "razorpay_response": rzp_res.get("raw_response")}
    )
    db.add(payment_req)
    await db.commit()
    await db.refresh(payment_req)

    await AuditService.log_event(
        db=db,
        merchant_id=merchant_id,
        actor_type="MERCHANT",
        action="PAYMENT_LINK_CREATED",
        title=f"Created Razorpay Payment Link for ₹{req.amount:,.2f} ({cust_name})",
        details=f"Payment Link ID: {rzp_res.get('id')} | Short URL: {rzp_res.get('short_url')}",
        metadata={"link_id": rzp_res.get("id"), "amount": req.amount}
    )

    return {
        "success": True,
        "payment_request_id": payment_req.id,
        "rzp_payment_link_id": rzp_res.get("id"),
        "short_url": rzp_res.get("short_url"),
        "amount": req.amount,
        "status": "CREATED"
    }

@router.post("/links/{link_id}/sync")
async def sync_payment_link_status(link_id: str, db: AsyncSession = Depends(get_db)):
    """
    Manually query Razorpay API to check latest status of a link.
    """
    stmt = select(PaymentRequest).where(PaymentRequest.id == link_id)
    res = await db.execute(stmt)
    payment_req = res.scalar_one_or_none()
    if not payment_req:
        raise HTTPException(status_code=404, detail="Payment link record not found")

    if payment_req.rzp_payment_link_id:
        rzp_data = razorpay_service.fetch_payment_link(payment_req.rzp_payment_link_id)
        if rzp_data.get("status"):
            payment_req.status = rzp_data.get("status").upper()
            if payment_req.status == "PAID" and not payment_req.paid_at:
                payment_req.paid_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(payment_req)

    return {
        "success": True,
        "id": payment_req.id,
        "rzp_payment_link_id": payment_req.rzp_payment_link_id,
        "status": payment_req.status,
        "amount": float(payment_req.amount)
    }
