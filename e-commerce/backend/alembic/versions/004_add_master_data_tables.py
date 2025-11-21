"""Add master data tables (categories, payment_methods, shipping_methods)

Revision ID: 004_add_master_data_tables
Revises: 003_add_audit_logs
Create Date: 2025-01-20 12:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004_add_master_data_tables"
down_revision: str = "003_add_audit_logs"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Create payment_method_type enum if it doesn't exist
    op.execute("DO $$ BEGIN CREATE TYPE paymentmethodtype AS ENUM ('CreditCard', 'DebitCard', 'PayPal', 'BankTransfer', 'CashOnDelivery', 'DigitalWallet', 'Other'); EXCEPTION WHEN duplicate_object THEN null; END $$;")

    # Create categories table
    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("modified_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("modified_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["categories.id"], name="fk_categories_parent_id"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_categories_tenant_id", "categories", ["tenant_id"], unique=False, if_not_exists=True)
    op.create_index("ix_categories_slug", "categories", ["slug"], unique=True, if_not_exists=True)
    op.create_index("ix_categories_parent_id", "categories", ["parent_id"], unique=False, if_not_exists=True)

    # Create payment_methods table
    op.create_table(
        "payment_methods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(
                "CreditCard",
                "DebitCard",
                "PayPal",
                "BankTransfer",
                "CashOnDelivery",
                "DigitalWallet",
                "Other",
                name="paymentmethodtype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("requires_processing", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("processing_fee_percentage", sa.Float(), nullable=True),
        sa.Column("processing_fee_fixed", sa.Float(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("modified_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("modified_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payment_methods_tenant_id", "payment_methods", ["tenant_id"], unique=False, if_not_exists=True)

    # Create shipping_methods table
    op.create_table(
        "shipping_methods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("estimated_days_min", sa.Integer(), nullable=True),
        sa.Column("estimated_days_max", sa.Integer(), nullable=True),
        sa.Column("base_cost_currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("base_cost_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("cost_per_kg_currency", sa.String(length=3), nullable=True),
        sa.Column("cost_per_kg_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("requires_signature", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_express", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("modified_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("modified_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_shipping_methods_tenant_id", "shipping_methods", ["tenant_id"], unique=False, if_not_exists=True)

    # Update products table to add foreign key to categories
    op.create_foreign_key(
        "fk_products_category_id",
        "products",
        "categories",
        ["category_id"],
        ["id"],
        ondelete="SET NULL",
        if_not_exists=True,
    )
    op.create_index("ix_products_category_id", "products", ["category_id"], unique=False, if_not_exists=True)

    # Update orders table to add foreign keys
    op.create_foreign_key(
        "fk_orders_payment_method_id",
        "orders",
        "payment_methods",
        ["payment_method_id"],
        ["id"],
        if_not_exists=True,
    )
    op.create_index("ix_orders_payment_method_id", "orders", ["payment_method_id"], unique=False, if_not_exists=True)

    # Add shipping_method_id to orders if it doesn't exist
    op.add_column("orders", sa.Column("shipping_method_id", postgresql.UUID(as_uuid=True), nullable=True), if_not_exists=True)
    op.create_foreign_key(
        "fk_orders_shipping_method_id",
        "orders",
        "shipping_methods",
        ["shipping_method_id"],
        ["id"],
        ondelete="SET NULL",
        if_not_exists=True,
    )
    op.create_index("ix_orders_shipping_method_id", "orders", ["shipping_method_id"], unique=False, if_not_exists=True)


def downgrade() -> None:
    # Drop foreign keys and indexes
    op.drop_index("ix_orders_shipping_method_id", "orders", if_exists=True)
    op.drop_constraint("fk_orders_shipping_method_id", "orders", type_="foreignkey", if_exists=True)
    op.drop_column("orders", "shipping_method_id", if_exists=True)
    
    op.drop_index("ix_orders_payment_method_id", "orders", if_exists=True)
    op.drop_constraint("fk_orders_payment_method_id", "orders", type_="foreignkey", if_exists=True)
    
    op.drop_index("ix_products_category_id", "products", if_exists=True)
    op.drop_constraint("fk_products_category_id", "products", type_="foreignkey", if_exists=True)

    # Drop tables
    op.drop_table("shipping_methods", if_exists=True)
    op.drop_table("payment_methods", if_exists=True)
    op.drop_table("categories", if_exists=True)

    # Drop enum
    op.execute("DROP TYPE IF EXISTS paymentmethodtype")

