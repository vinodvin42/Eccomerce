"""Add jewelry product fields

Revision ID: 007_add_jewelry_product_fields
Revises: 006_add_payment_transactions_table
Create Date: 2025-01-21 10:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007"
down_revision: str = "006"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Add jewelry-specific product fields
    op.add_column('products', sa.Column('weight', sa.Numeric(10, 3), nullable=True, comment='Product weight in grams'))
    op.add_column('products', sa.Column('material', sa.String(length=100), nullable=True, comment='Material type (e.g., Gold, Silver, Platinum)'))
    op.add_column('products', sa.Column('purity', sa.String(length=50), nullable=True, comment='Purity (e.g., 22K, 18K, 925)'))
    op.add_column('products', sa.Column('stone_type', sa.String(length=100), nullable=True, comment='Stone type (e.g., Diamond, Ruby, Emerald)'))
    op.add_column('products', sa.Column('size', sa.String(length=50), nullable=True, comment='Size (e.g., Ring size, Chain length)'))
    op.add_column('products', sa.Column('brand', sa.String(length=100), nullable=True, comment='Brand or manufacturer name'))
    op.add_column('products', sa.Column('color', sa.String(length=50), nullable=True, comment='Color (e.g., Yellow Gold, White Gold, Rose Gold)'))
    op.add_column('products', sa.Column('certification', sa.String(length=200), nullable=True, comment='Certification details'))
    op.add_column('products', sa.Column('warranty_period', sa.String(length=50), nullable=True, comment='Warranty period (e.g., 1 Year, Lifetime)'))
    op.add_column('products', sa.Column('origin', sa.String(length=100), nullable=True, comment='Origin or country of manufacture'))


def downgrade() -> None:
    op.drop_column('products', 'origin')
    op.drop_column('products', 'warranty_period')
    op.drop_column('products', 'certification')
    op.drop_column('products', 'color')
    op.drop_column('products', 'brand')
    op.drop_column('products', 'size')
    op.drop_column('products', 'stone_type')
    op.drop_column('products', 'purity')
    op.drop_column('products', 'material')
    op.drop_column('products', 'weight')

