"""Add pricing and calculation fields to products

Revision ID: 009_add_pricing_calculation_fields
Revises: 008_add_additional_jewelry_fields
Create Date: 2025-01-21 12:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "009"
down_revision: str = "008"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Add pricing and calculation fields
    op.add_column('products', sa.Column('group', sa.String(length=100), nullable=True, comment='Group (e.g., Gold, Silver, Rose Gold)'))
    op.add_column('products', sa.Column('wastage_percent', sa.Numeric(5, 2), nullable=True, comment='Wastage percentage'))
    op.add_column('products', sa.Column('metal_value', sa.Numeric(12, 2), nullable=True, comment='Metal value in currency'))
    op.add_column('products', sa.Column('wastage_value', sa.Numeric(12, 2), nullable=True, comment='Wastage value in currency'))
    op.add_column('products', sa.Column('making_charges', sa.Numeric(12, 2), nullable=True, comment='Making charges in currency'))
    op.add_column('products', sa.Column('stone_charges', sa.Numeric(12, 2), nullable=True, comment='Stone charges in currency'))
    op.add_column('products', sa.Column('gst_percent', sa.Numeric(5, 2), nullable=True, comment='GST percentage'))


def downgrade() -> None:
    op.drop_column('products', 'gst_percent')
    op.drop_column('products', 'stone_charges')
    op.drop_column('products', 'making_charges')
    op.drop_column('products', 'wastage_value')
    op.drop_column('products', 'metal_value')
    op.drop_column('products', 'wastage_percent')
    op.drop_column('products', 'group')

