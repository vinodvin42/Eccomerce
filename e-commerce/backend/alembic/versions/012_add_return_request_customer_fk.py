"""add fk for return request customer

Revision ID: 012_add_return_request_customer_fk
Revises: 011_add_return_requests_table
Create Date: 2025-11-21 14:30:00.000000
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "012_add_return_request_customer_fk"
down_revision = "011_add_return_requests_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_foreign_key(
        "fk_return_requests_customer_id",
        "return_requests",
        "users",
        ["customer_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_return_requests_customer_id", "return_requests", type_="foreignkey")


