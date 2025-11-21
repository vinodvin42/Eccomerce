"""Add payment_transactions table

Revision ID: 006_add_payment_transactions_table
Revises: 005_add_discounts_table
Create Date: 2025-01-20 16:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: str = "005"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Create payment provider enum
    op.execute(
        "DO $$ BEGIN CREATE TYPE paymentprovider AS ENUM ('Stripe', 'Razorpay', 'Manual'); EXCEPTION WHEN duplicate_object THEN null; END $$;"
    )

    # Create payment status enum
    op.execute(
        "DO $$ BEGIN CREATE TYPE paymentstatus AS ENUM ('Pending', 'Processing', 'Succeeded', 'Failed', 'Cancelled', 'Refunded', 'PartiallyRefunded'); EXCEPTION WHEN duplicate_object THEN null; END $$;"
    )

    # Create payment_transactions table
    op.create_table(
        "payment_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payment_method_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", postgresql.ENUM("Stripe", "Razorpay", "Manual", name="paymentprovider", create_type=False), nullable=False),
        sa.Column("provider_transaction_id", sa.String(length=255), nullable=True),
        sa.Column("provider_payment_intent_id", sa.String(length=255), nullable=True),
        sa.Column("amount_currency", sa.String(length=3), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("fee_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("net_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "Pending",
                "Processing",
                "Succeeded",
                "Failed",
                "Cancelled",
                "Refunded",
                "PartiallyRefunded",
                name="paymentstatus",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'Pending'"),
        ),
        sa.Column("metadata", sa.Text(), nullable=True),
        sa.Column("failure_reason", sa.String(length=500), nullable=True),
        sa.Column("last4", sa.String(length=4), nullable=True),
        sa.Column("card_brand", sa.String(length=50), nullable=True),
        sa.Column("card_exp_month", sa.Integer(), nullable=True),
        sa.Column("card_exp_year", sa.Integer(), nullable=True),
        sa.Column("refund_amount", sa.Numeric(12, 2), nullable=True, server_default="0"),
        sa.Column("refund_reason", sa.String(length=500), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("modified_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("modified_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], name="fk_payment_transactions_order_id"),
        sa.ForeignKeyConstraint(
            ["payment_method_id"], ["payment_methods.id"], name="fk_payment_transactions_payment_method_id"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payment_transactions_tenant_id", "payment_transactions", ["tenant_id"], unique=False, if_not_exists=True)
    op.create_index("ix_payment_transactions_order_id", "payment_transactions", ["order_id"], unique=False, if_not_exists=True)
    op.create_index(
        "ix_payment_transactions_payment_method_id", "payment_transactions", ["payment_method_id"], unique=False, if_not_exists=True
    )
    op.create_index(
        "ix_payment_transactions_provider_transaction_id",
        "payment_transactions",
        ["provider_transaction_id"],
        unique=False,
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index("ix_payment_transactions_provider_transaction_id", table_name="payment_transactions", if_exists=True)
    op.drop_index("ix_payment_transactions_payment_method_id", table_name="payment_transactions", if_exists=True)
    op.drop_index("ix_payment_transactions_order_id", table_name="payment_transactions", if_exists=True)
    op.drop_index("ix_payment_transactions_tenant_id", table_name="payment_transactions", if_exists=True)
    op.drop_table("payment_transactions")
    op.execute("DROP TYPE IF EXISTS paymentstatus")
    op.execute("DROP TYPE IF EXISTS paymentprovider")

