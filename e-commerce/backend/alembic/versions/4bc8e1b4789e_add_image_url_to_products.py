"""add_image_url_to_products

Revision ID: 4bc8e1b4789e
Revises: 004_add_master_data_tables
Create Date: 2025-11-20 12:21:18.751235

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4bc8e1b4789e'
down_revision: Union[str, None] = '004_add_master_data_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('products', sa.Column('image_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('products', 'image_url')

