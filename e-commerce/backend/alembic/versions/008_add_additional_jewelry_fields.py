"""Add additional jewelry product fields

Revision ID: 008_add_additional_jewelry_fields
Revises: 007_add_jewelry_product_fields
Create Date: 2025-01-21 11:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "008"
down_revision: str = "007"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Add additional jewelry-specific product fields
    op.add_column('products', sa.Column('hsn_code', sa.String(length=50), nullable=True, comment='HSN Code for taxation'))
    op.add_column('products', sa.Column('stone_weight', sa.Numeric(10, 3), nullable=True, comment='Stone weight in grams'))
    op.add_column('products', sa.Column('gross_weight', sa.Numeric(10, 3), nullable=True, comment='Gross weight in grams'))
    op.add_column('products', sa.Column('rate_per_gram', sa.Numeric(10, 2), nullable=True, comment='Rate per gram in currency'))
    op.add_column('products', sa.Column('gender', sa.String(length=20), nullable=True, comment='Gender (Male, Female, Unisex)'))
    op.add_column('products', sa.Column('ready_to_deliver', sa.Boolean(), nullable=True, default=False, comment='Ready to deliver status'))


def downgrade() -> None:
    op.drop_column('products', 'ready_to_deliver')
    op.drop_column('products', 'gender')
    op.drop_column('products', 'rate_per_gram')
    op.drop_column('products', 'gross_weight')
    op.drop_column('products', 'stone_weight')
    op.drop_column('products', 'hsn_code')

