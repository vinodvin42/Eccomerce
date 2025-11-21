"""Add return_requests table.

Revision ID: 011_add_return_requests_table
Revises: 010_add_product_ids_to_discounts
Create Date: 2025-01-21 18:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "011"
down_revision: str = "010"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN CREATE TYPE returnstatus AS ENUM ('Pending', 'Approved', 'Rejected', 'Refunded'); "
        "EXCEPTION WHEN duplicate_object THEN null; END $$;"
    )

    op.create_table(
        "return_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.String(length=2000), nullable=False),
        sa.Column("resolution_notes", sa.String(length=2000), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "Pending",
                "Approved",
                "Rejected",
                "Refunded",
                name="returnstatus",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'Pending'"),
        ),
        sa.Column("refund_transaction_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("refund_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("refund_currency", sa.String(length=3), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("modified_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("modified_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], name="fk_return_requests_order_id"),
        sa.ForeignKeyConstraint(
            ["refund_transaction_id"],
            ["payment_transactions.id"],
            name="fk_return_requests_refund_txn_id",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "order_id", name="uq_return_requests_tenant_order"),
    )
    op.create_index("ix_return_requests_tenant_id", "return_requests", ["tenant_id"])
    op.create_index("ix_return_requests_order_id", "return_requests", ["order_id"])
    op.create_index("ix_return_requests_customer_id", "return_requests", ["customer_id"])
    op.create_index(
        "ix_return_requests_refund_transaction_id", "return_requests", ["refund_transaction_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_return_requests_refund_transaction_id", table_name="return_requests")
    op.drop_index("ix_return_requests_customer_id", table_name="return_requests")
    op.drop_index("ix_return_requests_order_id", table_name="return_requests")
    op.drop_index("ix_return_requests_tenant_id", table_name="return_requests")
    op.drop_table("return_requests")
    op.execute("DROP TYPE IF EXISTS returnstatus")

