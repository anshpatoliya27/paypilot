import io
import re
import csv
import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional
import pandas as pd
from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.payment_request import PaymentRequest
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

class FileImporterService:
    """
    Universal Billing Importer: parses CSV, Excel (.xlsx, .xls), and PDF invoice files
    to ingest customer records, pending udhar balances, and bill items.
    """

    NAME_SYNONYMS = ["customer", "party", "client", "name", "account", "customer_name", "party_name", "buyer", "party_ledger"]
    PHONE_SYNONYMS = ["phone", "mobile", "contact", "whatsapp", "cell", "phone_number", "mobile_no", "contact_no"]
    BILL_SYNONYMS = ["invoice", "bill", "inv", "challan", "invoice_no", "bill_no", "invoice_number", "bill_number", "doc_no", "voucher_no"]
    AMOUNT_SYNONYMS = ["amount", "balance", "udhar", "pending", "due", "total", "net_amount", "pending_amount", "outstanding", "balance_amount", "closing_balance"]
    COMPANY_SYNONYMS = ["company", "firm", "store", "business", "enterprise", "org", "company_name"]

    @classmethod
    def _find_column_key(cls, columns: List[str], synonyms: List[str]) -> Optional[str]:
        for col in columns:
            clean = re.sub(r'[^a-zA-Z0-9]', '', str(col).lower())
            for syn in synonyms:
                clean_syn = re.sub(r'[^a-zA-Z0-9]', '', syn.lower())
                if clean == clean_syn or clean_syn in clean:
                    return col
        return None

    @classmethod
    def _clean_phone(cls, raw_phone: Any) -> str:
        if not raw_phone or pd.isna(raw_phone):
            return "+919876543210"
        digits = re.sub(r'[^0-9]', '', str(raw_phone))
        if len(digits) == 10:
            return f"+91{digits}"
        elif len(digits) == 12 and digits.startswith("91"):
            return f"+{digits}"
        elif len(digits) > 10:
            return f"+{digits}"
        return f"+91{digits.zfill(10)}"

    @classmethod
    def _clean_amount(cls, raw_amount: Any) -> Decimal:
        if not raw_amount or pd.isna(raw_amount):
            return Decimal("0.00")
        clean_str = re.sub(r'[^\d.]', '', str(raw_amount))
        try:
            return Decimal(clean_str) if clean_str else Decimal("0.00")
        except Exception:
            return Decimal("0.00")

    @classmethod
    def parse_file_to_rows(cls, file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        filename_lower = filename.lower()
        rows = []

        if filename_lower.endswith(".csv"):
            try:
                # Try UTF-8 first, fallback to Latin-1
                text = file_bytes.decode("utf-8-sig")
            except UnicodeDecodeError:
                text = file_bytes.decode("latin-1")
            
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                rows.append(dict(row))

        elif filename_lower.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(file_bytes))
            # Convert NaN to empty string
            df = df.fillna("")
            rows = df.to_dict(orient="records")

        elif filename_lower.endswith(".pdf"):
            reader = PdfReader(io.BytesIO(file_bytes))
            full_text = ""
            for page in reader.pages:
                full_text += page.extract_text() or ""
            
            # Simple line heuristic for PDF tables or bill summaries
            lines = [l.strip() for l in full_text.splitlines() if l.strip()]
            for line in lines:
                # Look for lines with phone numbers and amounts
                phone_match = re.search(r'(\+?91[\-\s]?)?[6-9]\d{9}', line)
                amount_match = re.search(r'(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{2})?)', line, re.IGNORECASE)
                inv_match = re.search(r'(INV|BILL|CH|GST)[-\s]?[0-9A-Za-z]+', line, re.IGNORECASE)

                if phone_match and amount_match:
                    rows.append({
                        "name": line.split()[0] if len(line.split()) > 0 else "Client",
                        "phone": phone_match.group(0),
                        "amount": amount_match.group(1).replace(",", ""),
                        "invoice_no": inv_match.group(0) if inv_match else f"INV-{datetime.now().strftime('%M%S')}"
                    })

        return rows

    @classmethod
    async def import_billing_data(
        cls, 
        file_bytes: bytes, 
        filename: str, 
        db: AsyncSession, 
        merchant_id: str = "merchant_demo_apex_01"
    ) -> Dict[str, Any]:
        """
        Parses uploaded file rows, maps Indian accounting fields, and inserts or updates
        Customer and PaymentRequest entities in database.
        """
        raw_rows = cls.parse_file_to_rows(file_bytes, filename)
        if not raw_rows:
            raise ValueError(f"Could not extract any valid records from {filename}. Please ensure the file contains columns like Customer Name, Phone, and Amount.")

        columns = list(raw_rows[0].keys())
        name_col = cls._find_column_key(columns, cls.NAME_SYNONYMS) or columns[0]
        phone_col = cls._find_column_key(columns, cls.PHONE_SYNONYMS)
        bill_col = cls._find_column_key(columns, cls.BILL_SYNONYMS)
        amt_col = cls._find_column_key(columns, cls.AMOUNT_SYNONYMS)
        company_col = cls._find_column_key(columns, cls.COMPANY_SYNONYMS)

        now = datetime.now(timezone.utc)
        imported_customers = []
        imported_invoices = []
        total_amount_rupees = Decimal("0.00")

        # Ensure merchant exists
        m_stmt = select(Merchant).filter_by(id=merchant_id)
        m_res = await db.execute(m_stmt)
        merchant = m_res.scalar_one_or_none()
        if not merchant:
            merchant = Merchant(
                id=merchant_id,
                business_name="Khushi Threads",
                name="Ansh Patoliya",
                email="khushithreads@gmail.com",
                currency="INR"
            )
            db.add(merchant)
            await db.flush()

        for idx, row in enumerate(raw_rows):
            raw_name = str(row.get(name_col, "")).strip()
            if not raw_name or raw_name.lower() in ["total", "subtotal", "grand total", "nan"]:
                continue

            customer_name = raw_name.title()
            phone = cls._clean_phone(row.get(phone_col) if phone_col else "")
            amount_rupees = cls._clean_amount(row.get(amt_col) if amt_col else "0.00")
            amount_paise = int(amount_rupees * 100)
            total_amount_rupees += amount_rupees

            invoice_no = str(row.get(bill_col, "")).strip() if bill_col else ""
            if not invoice_no or invoice_no.lower() == "nan":
                invoice_no = f"INV-IMP-{str(idx + 1).zfill(4)}"

            company_name = str(row.get(company_col, "")).strip() if company_col else f"{customer_name} Enterprise"
            email = f"{customer_name.lower().replace(' ', '.')}@billingclient.in"

            # Check if customer already exists by phone or name
            cust_stmt = select(Customer).filter(
                (Customer.merchant_id == merchant_id) & 
                ((Customer.phone == phone) | (Customer.name == customer_name))
            )
            cust_res = await db.execute(cust_stmt)
            customer = cust_res.scalar_one_or_none()

            risk = "HIGH" if amount_rupees > 10000 else ("MEDIUM" if amount_rupees > 0 else "LOW")
            overdue_days = 15 if amount_rupees > 0 else 0

            if not customer:
                customer_id = f"cust_imp_{abs(hash(phone + customer_name)) % 1000000}"
                customer = Customer(
                    id=customer_id,
                    merchant_id=merchant_id,
                    name=customer_name,
                    email=email,
                    phone=phone,
                    company_name=company_name,
                    outstanding_balance_paise=amount_paise,
                    lifetime_value_paise=amount_paise,
                    risk_category=risk,
                    failed_payment_count=0,
                    overdue_days=overdue_days,
                    last_payment_date=now - timedelta(days=5),
                    created_at=now,
                    updated_at=now
                )
                db.add(customer)
                imported_customers.append(customer_name)
            else:
                customer.outstanding_balance_paise += amount_paise
                customer.lifetime_value_paise += amount_paise
                if risk == "HIGH":
                    customer.risk_category = "HIGH"
                customer.updated_at = now

            await db.flush()

            # Create PaymentRequest for this bill
            pr_id = f"pay_req_{invoice_no.lower().replace('-', '_').replace(' ', '_')}_{idx}"
            payment_status = "PENDING" if amount_paise > 0 else "PAID"
            
            pr = PaymentRequest(
                id=pr_id,
                merchant_id=merchant_id,
                customer_id=customer.id,
                razorpay_payment_link_id=f"plink_imp_{invoice_no.lower().replace('-', '_')}",
                amount_paise=amount_paise,
                currency="INR",
                status=payment_status,
                description=f"Bill {invoice_no} for {customer_name}: Imported from {filename}",
                short_url=f"https://rzp.io/i/pay_{abs(hash(invoice_no)) % 1000000}",
                notify_sms=True,
                notify_email=True,
                meta_data={
                    "source": "file_import",
                    "filename": filename,
                    "invoice_no": invoice_no,
                    "amount_rupees": str(amount_rupees),
                    "customer_phone": phone
                },
                created_at=now,
                updated_at=now
            )
            db.add(pr)
            imported_invoices.append(invoice_no)

        # Record audit log
        audit = AuditLog(
            id=f"audit_file_import_{int(now.timestamp())}",
            merchant_id=merchant_id,
            actor_type="MERCHANT",
            action="FILE_BILLING_IMPORT",
            title=f"Imported Billing File: {filename}",
            details=f"Processed {len(imported_invoices)} invoices totaling INR {total_amount_rupees:,.2f} from {filename}.",
            meta_data={
                "filename": filename,
                "invoices_count": len(imported_invoices),
                "total_rupees": str(total_amount_rupees)
            },
            created_at=now
        )
        db.add(audit)
        await db.commit()

        return {
            "status": "success",
            "filename": filename,
            "detected_columns": {
                "name_column": name_col,
                "phone_column": phone_col,
                "bill_column": bill_col,
                "amount_column": amt_col
            },
            "imported_bills_count": len(imported_invoices),
            "imported_customers_count": len(imported_customers),
            "total_amount_rupees": float(total_amount_rupees),
            "sample_records": [
                {"name": r.get(name_col), "phone": r.get(phone_col), "amount": r.get(amt_col), "bill_no": r.get(bill_col)}
                for r in raw_rows[:5]
            ]
        }
