"""Add audit logs table

Revision ID: 003_add_audit_logs
Revises: 002_add_users
Create Date: 2025-11-19 20:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "003_add_audit_logs"
down_revision: str = "002_add_users"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Check if table already exists
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()
    
    if "audit_logs" not in tables:
        op.create_table(
            "audit_logs",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("entity_type", sa.String(length=100), nullable=False),
            sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("action", sa.String(length=20), nullable=False),
            sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("changes", sa.Text(), nullable=True),
            sa.Column("ip_address", sa.String(length=45), nullable=True),
            sa.Column("user_agent", sa.String(length=500), nullable=True),
            sa.Column("created_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
    
    # Create indexes if they don't exist
    indexes = [idx["name"] for idx in inspector.get_indexes("audit_logs")] if "audit_logs" in tables else []
    if "ix_audit_logs_entity_type" not in indexes:
        op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"], unique=False, if_not_exists=True)
    if "ix_audit_logs_entity_id" not in indexes:
        op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"], unique=False, if_not_exists=True)
    if "ix_audit_logs_tenant_id" not in indexes:
        op.create_index("ix_audit_logs_tenant_id", "audit_logs", ["tenant_id"], unique=False, if_not_exists=True)
    if "ix_audit_logs_action" not in indexes:
        op.create_index("ix_audit_logs_action", "audit_logs", ["action"], unique=False, if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_tenant_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity_type", table_name="audit_logs")
    op.drop_table("audit_logs")

