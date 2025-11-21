"""Add product_ids column to discounts table

Revision ID: 010_add_product_ids_to_discounts
Revises: 009_add_pricing_calculation_fields
Create Date: 2025-01-21 15:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "010"
down_revision: str = "009"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Add product_ids JSONB column to discounts table
    op.add_column(
        'discounts',
        sa.Column('product_ids', postgresql.JSONB, nullable=True, comment='Array of product IDs for Product scope discounts')
    )
    
    # Migrate existing product_id values to product_ids array
    # This converts single product_id to an array format
    op.execute("""
        UPDATE discounts
        SET product_ids = jsonb_build_array(product_id::text)
        WHERE product_id IS NOT NULL AND product_ids IS NULL;
    """)


def downgrade() -> None:
    # Drop the product_ids column
    op.drop_column('discounts', 'product_ids')

