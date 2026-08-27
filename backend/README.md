# PayPilot Backend Engine (Phase 1 & Phase 2 Foundation)

PayPilot is an **Autonomous AI Revenue Operations Agent** designed for the Razorpay payment ecosystem. It continuously monitors receivables, issues official Razorpay payment links, verifies incoming webhook events with HMAC-SHA256 signatures, prevents duplicate ledger mutations with database idempotency locks, reconciles customer balances in real-time, and records an immutable audit trail.

---

## 🏛️ Layered Architecture

```
FastAPI Router Layer (app/api/v1/)
├── health.py        (Liveness & DB readiness checks)
├── customers.py     (Client financial ledger queries & CRUD)
├── payments.py      (Payment Link creation, sync, and cancellation)
├── analytics.py     (Deterministic revenue & aging analytics)
└── webhooks.py      (Raw byte webhook ingestion & simulation harness)
        │
        ▼
Service Layer (app/services/)
├── RazorpayService      (Official Razorpay SDK Client & Sandbox Simulator)
├── WebhookService       (HMAC-SHA256 verification, idempotency, atomic ledger reconciliation)
├── RevenueService       (Deterministic SQL-based financial metrics)
├── AuditService         (Immutable structured event logging)
└── SeedService          (Realistic demo data generator)
        │
        ▼
Repository Layer (app/repositories/)
├── CustomerRepository
├── PaymentRepository
├── MerchantRepository
└── AuditRepository
        │
        ▼
Data & Schema Layer (app/models/ & app/schemas/)
├── SQLAlchemy 2.0 Async Models (Integer Paise standard)
└── Pydantic v2 Validation Schemas
```

---

## 💰 Financial Safety & Integer Paise Standard

To avoid floating-point binary precision inaccuracies, **all monetary amounts in the database and services are stored and computed strictly as integer paise** ($1\text{ INR} = 100\text{ paise}$):

* **₹25,000.00** is represented as `2500000` paise (`BigInteger`).
* **₹42,000.00** is represented as `4200000` paise (`BigInteger`).
* Helper utilities in `app.core.money` (`rupees_to_paise` and `paise_to_rupees`) use Python's `Decimal` with `ROUND_HALF_UP` for deterministic conversions.

---

## ⚡ Webhook Architecture & Idempotency Guarantee

### 1. Ingestion Pipeline
```
Razorpay Rails (or Test Harness)
       │ (HTTP POST with raw payload & X-Razorpay-Signature)
       ▼
app/api/v1/webhooks.py
       │
       ▼
HMAC-SHA256 Cryptographic Verification (app/core/security.py)
       │ ── [Invalid Signature] ──► 400 Bad Request
       ▼ [Valid Signature]
Idempotency Registry Lookup (webhook_events table)
       │ ── [Duplicate Event ID] ──► Return "duplicate" (Zero ledger mutation)
       ▼ [New Event ID]
Atomic Transaction:
  1. Update PaymentRequest (status -> PAID / FAILED / EXPIRED / CANCELLED)
  2. Reconcile Customer Ledger (outstanding_balance_paise, lifetime_value_paise, risk)
  3. Append Structured Audit Log (actor_type = RAZORPAY_WEBHOOK)
  4. Record WebhookEvent (status = PROCESSED)
  5. Commit Transaction
```

### 2. Supported Official Razorpay Events
* **`payment_link.paid`**: Payment Link settled. Payment marked `PAID`, customer balance reduced, LTV increased, risk reset to `LOW`.
* **`payment.captured`**: Direct payment captured. Ledger reconciled and audited.
* **`payment.failed`**: Payment attempt failed. Error code, description, and method recorded; customer failure count incremented; risk escalated to `HIGH` on repeated failures.
* **`payment_link.expired`**: Payment link expired on Razorpay. Status updated to `EXPIRED`.
* **`payment_link.cancelled`**: Payment link cancelled by merchant. Status updated to `CANCELLED`.

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` in the `backend/` directory:

```bash
cp .env.example .env
```

### Environment Variables:

| Variable | Description | Default |
|---|---|---|
| `PROJECT_NAME` | Service name | `PayPilot` |
| `APP_ENV` | Environment (`development`, `staging`, `production`) | `development` |
| `DATABASE_URL` | Async SQLAlchemy URL | `sqlite+aiosqlite:///./paypilot.db` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID (Test Mode) | `rzp_test_placeholder_key` |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | `rzp_test_placeholder_secret` |
| `RAZORPAY_WEBHOOK_SECRET` | Secret for HMAC-SHA256 signature verification | `paypilot_webhook_secret_dev` |
| `CORS_ORIGINS` | Allowed frontend origins | `["http://localhost:5173", ...]` |

---

## 🚀 Running Locally

### 1. Database Migrations (Alembic)

```bash
python -m alembic upgrade head
```

### 2. Start FastAPI Server

```bash
python -m uvicorn app.main:app --port 8000 --reload
```

Interactive OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

### 3. Run Test Suite

```bash
python -m pytest -v
```

---

## 🧪 Testing Webhook Reconciliation

### Development & Demo Webhook Simulator
To simulate a cryptographically signed payment webhook for **ABC Enterprises Ltd (₹42,000.00)**:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/webhooks/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "cust_abc_ltd_01",
    "amount_rupees": "42000.00",
    "event_type": "payment_link.paid"
  }'
```
This generates an official Razorpay webhook envelope, calculates the HMAC-SHA256 signature, and passes it through the exact real webhook verification and reconciliation pipeline!
