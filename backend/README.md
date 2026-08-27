# PayPilot Backend Engine (Phase 1 Foundation)

PayPilot is an **Autonomous AI Revenue Operations Agent** designed for the modern business and Razorpay ecosystem. It continuously monitors receivables, automates recovery workflows via official Razorpay payment rails, requires Human-in-the-Loop (HITL) approval for financial actions, verifies incoming webhook events with HMAC-SHA256, and maintains an immutable audit trail.

---

## 🏛️ Layered Architecture

PayPilot follows a strict separation of concerns:

```
FastAPI Router Layer (app/api/v1/)
        │
        ▼
Service Layer (app/services/)
├── RazorpayService      (Official Razorpay SDK Client & Sandbox Simulator)
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

## 🗄️ Database Models & Schema

1. **`Merchant`**: Business entity profile, currency, and multi-tenant scoping.
2. **`Customer`**: Client ledger containing `outstanding_balance_paise`, `lifetime_value_paise`, `risk_category` (`LOW`, `MEDIUM`, `HIGH`), and `overdue_days`.
3. **`PaymentRequest`**: Razorpay Payment Links tracking (`amount_paise`, `razorpay_payment_link_id`, `status`, `short_url`, `expires_at`, `paid_at`).
4. **`Approval`**: Staged 2-phase commit records for Human-in-the-Loop financial mutations.
5. **`AuditLog`**: Immutable activity trail recording actor (`AGENT`, `MERCHANT`, `RAZORPAY_WEBHOOK`, `SYSTEM`), action, and metadata.
6. **`WebhookEvent`**: Razorpay webhook idempotency registry with unique `razorpay_event_id` constraint.

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

## 🚀 Getting Started

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Database Migrations (Alembic)

Alembic serves as the source of truth for schema evolution. To apply the initial migration:

```bash
python -m alembic upgrade head
```

### 3. Run FastAPI Backend

```bash
python -m uvicorn app.main:app --port 8000 --reload
```

Interactive OpenAPI documentation is available at:
* Swagger UI: `http://127.0.0.1:8000/docs`
* ReDoc: `http://127.0.0.1:8000/redoc`

---

## 🧪 Running Tests

Execute the comprehensive Pytest suite:

```bash
python -m pytest -v
```

Execute tests with code coverage analysis:

```bash
python -m pytest --cov=app
```

---

## 🔌 API Endpoints Summary (v1)

* `GET /api/v1/health`: Liveness probe.
* `GET /api/v1/health/ready`: Database readiness check.
* `GET /api/v1/customers`: List customers with filtering (`risk_category`, `overdue_only`, search).
* `POST /api/v1/customers`: Create customer record.
* `GET /api/v1/customers/{id}`: Detailed customer profile with payment history.
* `GET /api/v1/payments/links`: List Razorpay payment requests.
* `POST /api/v1/payments/links`: Create Razorpay payment link with automatic paise conversion.
* `POST /api/v1/payments/links/{id}/sync`: Sync status with Razorpay API.
* `GET /api/v1/analytics/overview`: Deterministic revenue summary metrics.
* `GET /api/v1/analytics/overdue`: Overdue accounts aging breakdown (0-7d, 8-14d, 15+d).
* `POST /api/v1/seed/scenario`: Reset and seed demo scenario with ₹75,500 overdue across ABC Ltd, Rahul Sharma, and Priya Mehta.

---

## 🔒 Security Practices

1. **No Secrets in Frontend / Git**: Secrets (`RAZORPAY_KEY_SECRET`, `DATABASE_URL`) are read exclusively from server environment variables.
2. **HMAC-SHA256 Webhook Verification**: All incoming webhooks must match the cryptographic signature generated by Razorpay.
3. **Idempotency**: Webhook events are deduplicated via unique Razorpay event IDs to prevent double ledger credits.
4. **Deterministic Math**: Financial metrics are computed using SQL aggregate queries and integer paise arithmetic, never delegated to LLM mental math.
