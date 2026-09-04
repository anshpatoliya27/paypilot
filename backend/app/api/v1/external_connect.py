import logging
from typing import Optional, Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, UploadFile, File, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.money import rupees_to_paise
from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from app.models.merchant import Merchant
from app.services.file_importer_service import FileImporterService
from app.services.api_key_service import ApiKeyService, DEFAULT_MERCHANT_API_KEY
from app.services.webhook_service import WebhookService

logger = logging.getLogger(__name__)

router = APIRouter()

class InvoiceSyncRequest(BaseModel):
    customer_name: str
    phone: str
    invoice_no: str
    amount_rupees: float
    due_date: Optional[str] = None
    company_name: Optional[str] = None

class WhatsAppLinkRequest(BaseModel):
    customer_name: str
    phone: str
    amount_rupees: float
    bill_no: Optional[str] = "INV-PENDING"
    payment_url: Optional[str] = None

class SimulatePaymentRequest(BaseModel):
    payment_link_id: Optional[str] = None
    invoice_no: Optional[str] = None
    customer_id: Optional[str] = None
    amount_rupees: Optional[float] = None

@router.post("/upload")
async def upload_billing_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Universal Billing Importer Endpoint:
    Accepts CSV, Excel (.xlsx, .xls), or PDF billing files, detects column names,
    and updates customer balances and pending invoices in PayPilot.
    """
    valid_exts = (".csv", ".xlsx", ".xls", ".pdf")
    if not any(file.filename.lower().endswith(ext) for ext in valid_exts):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format '{file.filename}'. Please upload a CSV, Excel (.xlsx, .xls), or PDF invoice."
        )

    try:
        content = await file.read()
        result = await FileImporterService.import_billing_data(
            file_bytes=content,
            filename=file.filename,
            db=db,
            merchant_id="merchant_demo_apex_01"
        )
        return result
    except ValueError as ve:
        logger.warning(f"Validation error importing file {file.filename}: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error importing billing file {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process billing file: {str(e)}")

@router.get("/api-keys")
async def get_api_keys():
    """
    Returns merchant API keys, sync endpoints, and integration code snippets
    (cURL, Python, Node.js) for external software connections.
    """
    return ApiKeyService.get_merchant_api_credentials()

@router.post("/invoices")
async def sync_external_invoice(
    payload: InvoiceSyncRequest,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Universal Ingestion API:
    Allows any external billing software (Tally, Vyapar, Marg, Zoho, or custom ERP)
    to push invoices directly into PayPilot in real-time.
    """
    if authorization and not ApiKeyService.verify_api_key(authorization):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Merchant API Key. Check the Integrations Hub for your live API Key."
        )

    merchant_id = "merchant_demo_apex_01"
    clean_phone = FileImporterService._clean_phone(payload.phone)
    amount_rupees = Decimal(str(payload.amount_rupees))
    amount_paise = rupees_to_paise(amount_rupees)

    # 1. Match or Create Customer
    cust_stmt = select(Customer).filter(
        (Customer.merchant_id == merchant_id) &
        ((Customer.phone == clean_phone) | (Customer.name == payload.customer_name.strip().title()))
    )
    cust_res = await db.execute(cust_stmt)
    customer = cust_res.scalar_one_or_none()

    risk = "HIGH" if amount_rupees > 10000 else ("MEDIUM" if amount_rupees > 0 else "LOW")
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)

    if not customer:
        customer_id = f"cust_api_{abs(hash(clean_phone + payload.customer_name)) % 1000000}"
        customer = Customer(
            id=customer_id,
            merchant_id=merchant_id,
            name=payload.customer_name.strip().title(),
            email=f"{payload.customer_name.lower().replace(' ', '.')}@external.in",
            phone=clean_phone,
            company_name=payload.company_name or f"{payload.customer_name} Store",
            outstanding_balance_paise=amount_paise,
            lifetime_value_paise=amount_paise,
            risk_category=risk,
            failed_payment_count=0,
            overdue_days=10 if amount_rupees > 0 else 0,
            last_payment_date=now - timedelta(days=2),
            created_at=now,
            updated_at=now
        )
        db.add(customer)
    else:
        customer.outstanding_balance_paise += amount_paise
        customer.lifetime_value_paise += amount_paise
        customer.updated_at = now

    await db.flush()

    # 2. Create Payment Request
    inv_clean = payload.invoice_no.replace("-", "_").replace(" ", "_").lower()
    pr_id = f"pay_req_api_{inv_clean}_{int(now.timestamp()) % 10000}"
    plink_id = f"plink_api_{inv_clean}"
    short_url = f"https://rzp.io/i/pay_{abs(hash(payload.invoice_no)) % 1000000}"

    pr = PaymentRequest(
        id=pr_id,
        merchant_id=merchant_id,
        customer_id=customer.id,
        razorpay_payment_link_id=plink_id,
        amount_paise=amount_paise,
        currency="INR",
        status="PENDING",
        description=f"Invoice {payload.invoice_no} for {payload.customer_name} via Ingestion API",
        short_url=short_url,
        notify_sms=True,
        notify_email=True,
        meta_data={
            "source": "api_connect",
            "invoice_no": payload.invoice_no,
            "amount_rupees": str(amount_rupees),
            "phone": clean_phone
        },
        created_at=now,
        updated_at=now
    )
    db.add(pr)
    await db.commit()

    # Generate WhatsApp Link
    wa_dispatch = ApiKeyService.generate_whatsapp_dispatch(
        customer_name=customer.name,
        phone=clean_phone,
        amount_rupees=float(amount_rupees),
        bill_no=payload.invoice_no,
        payment_url=short_url
    )

    return {
        "status": "synced",
        "invoice_no": payload.invoice_no,
        "customer_name": customer.name,
        "phone": clean_phone,
        "amount_rupees": float(amount_rupees),
        "payment_link_id": plink_id,
        "payment_url": short_url,
        "whatsapp_url": wa_dispatch["whatsapp_url"],
        "whatsapp_message": wa_dispatch["message"]
    }

@router.post("/whatsapp-link")
async def create_whatsapp_link(payload: WhatsAppLinkRequest):
    """
    Generates ready-to-dispatch WhatsApp message and 1-Click wa.me URL
    for customer payment collection.
    """
    return ApiKeyService.generate_whatsapp_dispatch(
        customer_name=payload.customer_name,
        phone=payload.phone,
        amount_rupees=payload.amount_rupees,
        bill_no=payload.bill_no or "INV-PENDING",
        payment_url=payload.payment_url
    )

@router.post("/simulate-payment")
async def simulate_instant_payment(
    payload: SimulatePaymentRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Simulates customer completing payment via UPI/WhatsApp link.
    Instantly runs through Razorpay webhook signature verification,
    updates status to PAID, deducts customer pending balance, and logs audit record.
    """
    # Find matching payment request
    pr = None
    if payload.payment_link_id:
        stmt = select(PaymentRequest).where(PaymentRequest.razorpay_payment_link_id == payload.payment_link_id)
        res = await db.execute(stmt)
        pr = res.scalar_one_or_none()
    elif payload.invoice_no:
        stmt = select(PaymentRequest).where(PaymentRequest.description.ilike(f"%{payload.invoice_no}%"))
        res = await db.execute(stmt)
        pr = res.scalars().first()
    elif payload.customer_id:
        stmt = select(PaymentRequest).where(
            (PaymentRequest.customer_id == payload.customer_id) &
            (PaymentRequest.status != "PAID")
        ).order_by(PaymentRequest.created_at.desc())
        res = await db.execute(stmt)
        pr = res.scalars().first()

    if not pr:
        # Fallback to any pending payment request
        stmt = select(PaymentRequest).where(PaymentRequest.status != "PAID").order_by(PaymentRequest.created_at.desc())
        res = await db.execute(stmt)
        pr = res.scalars().first()

    if not pr:
        raise HTTPException(status_code=404, detail="No pending payment requests found to simulate payment.")

    cust_stmt = select(Customer).where(Customer.id == pr.customer_id)
    cust_res = await db.execute(cust_stmt)
    customer = cust_res.scalar_one_or_none()

    amount_paise = pr.amount_paise
    if payload.amount_rupees:
        amount_paise = rupees_to_paise(Decimal(str(payload.amount_rupees)))

    raw_body, signature, event_id = WebhookService.generate_signed_webhook_envelope(
        event_type="payment_link.paid",
        amount_paise=amount_paise,
        payment_link_id=pr.razorpay_payment_link_id or f"plink_sim_{pr.id[:8]}",
        customer_id=customer.id if customer else "cust_sim_01",
        customer_email=customer.email if customer else "client@billing.in",
        customer_contact=customer.phone if customer else "+919876543210"
    )

    reconciliation = await WebhookService.process_webhook(
        db=db,
        raw_body=raw_body,
        signature_header=signature,
        event_id_header=event_id
    )

    return {
        "status": "PAID",
        "message": f"Payment of INR {pr.amount_rupees} simulated and reconciled successfully.",
        "invoice_no": pr.meta_data.get("invoice_no") if pr.meta_data else "INV",
        "customer_name": customer.name if customer else "Customer",
        "reconciliation": reconciliation
    }

# -------------------------------------------------------------
# Direct WhatsApp Automated Background Dispatching
# -------------------------------------------------------------
from app.services.whatsapp_service import WhatsAppDeviceService

@router.get("/whatsapp/status")
async def get_whatsapp_status():
    """
    Returns the active mobile WhatsApp pairing status (Connected / Disconnected).
    """
    return WhatsAppDeviceService.get_status()

@router.post("/whatsapp/connect")
async def connect_whatsapp_device(payload: Dict[str, Any] = None):
    """
    Pairs mobile WhatsApp session via QR code scan simulation.
    """
    phone = payload.get("phone", "+91 90169 29244") if payload else "+91 90169 29244"
    return WhatsAppDeviceService.connect_device(phone=phone)

@router.post("/whatsapp/disconnect")
async def disconnect_whatsapp_device():
    """
    Disconnects the active WhatsApp device.
    """
    return WhatsAppDeviceService.disconnect()

@router.post("/whatsapp/send-direct")
async def send_direct_whatsapp_reminder(payload: WhatsAppLinkRequest):
    """
    Sends WhatsApp payment reminder directly in the background.
    Does NOT require opening wa.me or WhatsApp web interface.
    """
    res = WhatsAppDeviceService.send_direct_message(
        customer_name=payload.customer_name,
        phone=payload.phone,
        amount_rupees=payload.amount_rupees,
        bill_no=payload.bill_no or "INV-PENDING",
        payment_url=payload.payment_url
    )
    return res

@router.post("/whatsapp/send-bulk")
async def send_bulk_whatsapp_reminders(db: AsyncSession = Depends(get_db)):
    """
    Directly sends WhatsApp payment reminders to all customers with pending balances in the background.
    """
    stmt = select(Customer).where(Customer.outstanding_balance_paise > 0)
    res = await db.execute(stmt)
    overdue_customers = res.scalars().all()

    results = []
    for c in overdue_customers:
        bal_rupees = float(c.outstanding_balance_rupees)
        dispatched = WhatsAppDeviceService.send_direct_message(
            customer_name=c.name,
            phone=c.phone,
            amount_rupees=bal_rupees,
            bill_no=f"INV-KT-{c.id[:4].upper()}"
        )
        results.append(dispatched)

    return {
        "status": "COMPLETED",
        "total_sent": len(results),
        "dispatches": results,
        "message": f"Successfully sent {len(results)} automated WhatsApp reminders directly to customer phones."
    }
