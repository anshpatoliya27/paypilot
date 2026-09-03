# PayPilot — Operations, Database & Cloud Deployment Guide

This guide details how to run PayPilot locally, connect **Neon Serverless PostgreSQL**, and deploy the backend to **Google Cloud Run**.

---

## 1. How to Start Everything Locally

### Terminal 1: Backend (FastAPI + Python)
```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
- **API URL**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### Terminal 2: Frontend (React + Vite)
```powershell
cd frontend
npm run dev
```
- **Frontend App**: [http://localhost:5173](http://localhost:5173)

---

## 2. Connecting Neon Serverless Database (PostgreSQL)

PayPilot is pre-configured with **`asyncpg`** and automated URL normalization for **Neon Database** (serverless PostgreSQL).

### Step 1: Create a Free Neon Database
1. Go to [https://neon.tech](https://neon.tech) and sign up / log in.
2. Click **Create Project**, name it `paypilot`, and select your nearest region (e.g. `aws-ap-south-1` for Mumbai/India or `aws-us-east-2`).
3. In your Neon dashboard, copy your connection string. It looks like:
   ```
   postgresql://paypilot_owner:npg_xyz@ep-cold-forest-a1b2c3d4-pooler.us-east-2.aws.neon.tech/paypilot?sslmode=require
   ```

### Step 2: Update `backend/.env`
Open `backend/.env` and replace `DATABASE_URL` with your Neon connection string:
```env
DATABASE_URL=postgresql://paypilot_owner:npg_xyz@ep-cold-forest-a1b2c3d4-pooler.us-east-2.aws.neon.tech/paypilot?sslmode=require
```
*(PayPilot's `resolve_db_url_and_args` automatically adapts `postgresql://` to `postgresql+asyncpg://` and configures SSL + connection pooling parameters).*

### Step 3: Run Alembic Migrations
Run the migration command from the `backend` folder:
```powershell
cd backend
python -m alembic upgrade head
```

### Step 4: Restart Backend
Restart the FastAPI server:
```powershell
python -m uvicorn app.main:app --reload --port 8000
```
Upon startup, PayPilot will automatically connect to Neon, verify the schema, and seed the demo fixture accounts (ABC Enterprises Ltd, Rahul Sharma, Priya Mehta) ready for instant testing.

---

## 3. Deploying to Google Cloud (Google Cloud Run)

Google Cloud Run is the recommended choice for PayPilot:
- **Serverless containerization**: Zero server management.
- **Auto-scales to zero**: Costs **$0** when idle; handles traffic spikes seamlessly.
- **Native HTTPS & Custom Domains**: Free Google-managed SSL certificates.
- **Generous Free Tier**: 2,000,000 requests/month free.

### Prerequisites
1. Install [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install).
2. Authenticate:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_GCP_PROJECT_ID
   ```

### Deploying Backend with a Single Command
From the project root:
```bash
gcloud run deploy paypilot-backend \
  --source ./backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="PROJECT_NAME=PayPilot,APP_ENV=production,DATABASE_URL=YOUR_NEON_POSTGRES_URL,RAZORPAY_KEY_ID=YOUR_KEY,RAZORPAY_KEY_SECRET=YOUR_SECRET,RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET"
```

Cloud Run will build the Docker container automatically via Google Cloud Build and give you a live HTTPS endpoint:
```
Service URL: https://paypilot-backend-xyz.a.run.app
```

### Deploying Frontend
The frontend can be built and deployed to **Google Cloud Storage + Cloud CDN / Firebase Hosting** or **Vercel** with one command:
```bash
cd frontend
npm run build
```
Set the API base in production to your Google Cloud Run URL.
