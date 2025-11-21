"""Category persistence model."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditMixin, Base, TenantMixin


class Category(TenantMixin, AuditMixin, Base):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(length=255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(length=1000), nullable=True)
    slug: Mapped[str] = mapped_column(String(length=255), nullable=False, unique=True, index=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )  # For hierarchical categories
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    parent: Mapped["Category | None"] = relationship(
        "Category", remote_side="Category.id", backref="children", foreign_keys=[parent_id]
    )

