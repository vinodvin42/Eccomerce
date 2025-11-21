"""Add discounts table

Revision ID: 005_add_discounts_table
Revises: 4bc8e1b4789e
Create Date: 2025-01-20 15:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: str = "4bc8e1b4789e"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Fix alembic_version table if needed (for long revision IDs)
    op.execute("""
        DO $$ 
        BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'alembic_version' 
                       AND column_name = 'version_num' 
                       AND character_maximum_length < 100) THEN
                ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(100);
            END IF;
        END $$;
    """)
    
    # Create discount type enum
    op.execute(
        "DO $$ BEGIN CREATE TYPE discounttype AS ENUM ('Percentage', 'FixedAmount', 'FreeShipping'); EXCEPTION WHEN duplicate_object THEN null; END $$;"
    )

    # Create discount scope enum
    op.execute(
        "DO $$ BEGIN CREATE TYPE discountscope AS ENUM ('Product', 'Category', 'Order', 'Cart'); EXCEPTION WHEN duplicate_object THEN null; END $$;"
    )

    # Create discount status enum
    op.execute(
        "DO $$ BEGIN CREATE TYPE discountstatus AS ENUM ('Active', 'Inactive', 'Expired'); EXCEPTION WHEN duplicate_object THEN null; END $$;"
    )

    # Create discounts table
    op.create_table(
        "discounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("discount_type", postgresql.ENUM("Percentage", "FixedAmount", "FreeShipping", name="discounttype", create_type=False), nullable=False),
        sa.Column("discount_value", sa.Numeric(10, 2), nullable=True),
        sa.Column("discount_currency", sa.String(length=3), nullable=True),
        sa.Column("scope", postgresql.ENUM("Product", "Category", "Order", "Cart", name="discountscope", create_type=False), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_uses", sa.Integer(), nullable=True),
        sa.Column("max_uses_per_customer", sa.Integer(), nullable=True),
        sa.Column("current_uses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("minimum_order_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("minimum_order_currency", sa.String(length=3), nullable=True),
        sa.Column("status", postgresql.ENUM("Active", "Inactive", "Expired", name="discountstatus", create_type=False), nullable=False, server_default=sa.text("'Active'")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("modified_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("modified_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], name="fk_discounts_product_id"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], name="fk_discounts_category_id"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_discounts_tenant_id", "discounts", ["tenant_id"], unique=False, if_not_exists=True)
    op.create_index("ix_discounts_code", "discounts", ["code"], unique=True, if_not_exists=True)
    op.create_index("ix_discounts_product_id", "discounts", ["product_id"], unique=False, if_not_exists=True)
    op.create_index("ix_discounts_category_id", "discounts", ["category_id"], unique=False, if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_discounts_category_id", table_name="discounts", if_exists=True)
    op.drop_index("ix_discounts_product_id", table_name="discounts", if_exists=True)
    op.drop_index("ix_discounts_code", table_name="discounts", if_exists=True)
    op.drop_index("ix_discounts_tenant_id", table_name="discounts", if_exists=True)
    op.drop_table("discounts")
    op.execute("DROP TYPE IF EXISTS discountstatus")
    op.execute("DROP TYPE IF EXISTS discountscope")
    op.execute("DROP TYPE IF EXISTS discounttype")

