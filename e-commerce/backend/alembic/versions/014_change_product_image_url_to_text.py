"""Change product image_url to text

Revision ID: 014
Revises: 013_change_product_description_to_text
Create Date: 2025-01-21 12:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "014_change_product_image_url_to_text"
down_revision: str = "013_change_product_description_to_text"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Change image_url column from VARCHAR(500) to TEXT
    op.alter_column('products', 'image_url',
                    existing_type=sa.String(length=500),
                    type_=sa.Text(),
                    existing_nullable=True)


def downgrade() -> None:
    # Revert image_url column back to VARCHAR(500)
    op.alter_column('products', 'image_url',
                    existing_type=sa.Text(),
                    type_=sa.String(length=500),
                    existing_nullable=True)

