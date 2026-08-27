from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal

class RevenueOverviewResponse(BaseModel):
    realized_revenue_paise: int
    realized_revenue_rupees: Decimal
    paid_transactions_count: int
    
    total_outstanding_paise: int
    total_outstanding_rupees: Decimal
    overdue_customers_count: int
    
    revenue_at_risk_paise: int
    revenue_at_risk_rupees: Decimal
    at_risk_customers_count: int
    
    active_payment_links: int
    failed_payments_count: int
    collection_rate_percent: float
    currency: str = "INR"

class AgingClientSummary(BaseModel):
    id: str
    name: str
    company_name: Optional[str] = None
    amount_paise: int
    amount_rupees: Decimal
    overdue_days: int
    risk: str

class AgingBucketItem(BaseModel):
    label: str
    amount_paise: int
    amount_rupees: Decimal
    count: int
    clients: List[AgingClientSummary]

class AgingBreakdownResponse(BaseModel):
    buckets: List[AgingBucketItem]
    total_delinquent_paise: int
    total_delinquent_rupees: Decimal
