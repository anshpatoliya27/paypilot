"""Initial database schema with integer paise standard

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-27 13:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Merchants Table
    op.create_table(
        'merchants',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('business_name', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='INR', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f('ix_merchants_email'), 'merchants', ['email'], unique=True)

    # 2. Customers Table
    op.create_table(
        'customers',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('merchant_id', sa.String(length=36), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('outstanding_balance_paise', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('lifetime_value_paise', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('risk_category', sa.String(length=50), server_default='LOW', nullable=False),
        sa.Column('failed_payment_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('overdue_days', sa.Integer(), server_default='0', nullable=False),
        sa.Column('last_payment_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f('ix_customers_merchant_id'), 'customers', ['merchant_id'], unique=False)
    op.create_index(op.f('ix_customers_email'), 'customers', ['email'], unique=False)
    op.create_index(op.f('ix_customers_risk_category'), 'customers', ['risk_category'], unique=False)
    op.create_index(op.f('ix_customers_overdue_days'), 'customers', ['overdue_days'], unique=False)

    # 3. Payment Requests Table
    op.create_table(
        'payment_requests',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('merchant_id', sa.String(length=36), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('customer_id', sa.String(length=36), sa.ForeignKey('customers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('razorpay_payment_link_id', sa.String(length=100), nullable=True),
        sa.Column('razorpay_payment_id', sa.String(length=100), nullable=True),
        sa.Column('amount_paise', sa.BigInteger(), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='INR', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='CREATED', nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('short_url', sa.String(length=500), nullable=True),
        sa.Column('notify_sms', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('notify_email', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('meta_data', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f('ix_payment_requests_merchant_id'), 'payment_requests', ['merchant_id'], unique=False)
    op.create_index(op.f('ix_payment_requests_customer_id'), 'payment_requests', ['customer_id'], unique=False)
    op.create_index(op.f('ix_payment_requests_razorpay_payment_link_id'), 'payment_requests', ['razorpay_payment_link_id'], unique=True)
    op.create_index(op.f('ix_payment_requests_razorpay_payment_id'), 'payment_requests', ['razorpay_payment_id'], unique=False)
    op.create_index(op.f('ix_payment_requests_status'), 'payment_requests', ['status'], unique=False)

    # 4. Approvals Table
    op.create_table(
        'approvals',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('merchant_id', sa.String(length=36), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('action_type', sa.String(length=100), nullable=False),
        sa.Column('risk_level', sa.String(length=50), server_default='MEDIUM', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='PENDING', nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('agent_reasoning', sa.Text(), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('execution_result', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_approvals_merchant_id'), 'approvals', ['merchant_id'], unique=False)
    op.create_index(op.f('ix_approvals_status'), 'approvals', ['status'], unique=False)

    # 5. Audit Logs Table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('merchant_id', sa.String(length=36), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('actor_type', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('meta_data', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f('ix_audit_logs_merchant_id'), 'audit_logs', ['merchant_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)

    # 6. Webhook Events Table
    op.create_table(
        'webhook_events',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('razorpay_event_id', sa.String(length=100), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='PROCESSED', nullable=False),
        sa.Column('raw_payload', sa.JSON(), nullable=False),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_webhook_events_razorpay_event_id'), 'webhook_events', ['razorpay_event_id'], unique=True)
    op.create_index(op.f('ix_webhook_events_event_type'), 'webhook_events', ['event_type'], unique=False)
    op.create_index(op.f('ix_webhook_events_received_at'), 'webhook_events', ['received_at'], unique=False)


def downgrade() -> None:
    op.drop_table('webhook_events')
    op.drop_table('audit_logs')
    op.drop_table('approvals')
    op.drop_table('payment_requests')
    op.drop_table('customers')
    op.drop_table('merchants')
