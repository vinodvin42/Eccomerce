"""Change product description to text

Revision ID: 013
Revises: 012
Create Date: 2025-01-21 12:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "013_change_product_description_to_text"
down_revision: str = "012_add_return_request_customer_fk"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Change description column from VARCHAR(2000) to TEXT
    op.alter_column('products', 'description',
                    existing_type=sa.String(length=2000),
                    type_=sa.Text(),
                    existing_nullable=True)


def downgrade() -> None:
    # Revert description column back to VARCHAR(2000)
    op.alter_column('products', 'description',
                    existing_type=sa.Text(),
                    type_=sa.String(length=2000),
                    existing_nullable=True)

