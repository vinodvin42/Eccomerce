"""Category service layer."""

from __future__ import annotations

from typing import Sequence
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryService:
    """Encapsulates category operations with tenant isolation."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_categories(
        self,
        tenant_id: UUID,
        page: int = 1,
        page_size: int = 100,
        is_active: bool | None = None,
    ) -> tuple[Sequence[Category], int]:
        """List categories for a tenant."""
        query = select(Category).where(Category.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(Category).where(Category.tenant_id == tenant_id)

        if is_active is not None:
            query = query.where(Category.is_active == is_active)
            count_stmt = count_stmt.where(Category.is_active == is_active)

        query = query.order_by(Category.name).offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        items = result.scalars().all()

        total = (await self.session.execute(count_stmt)).scalar_one()
        return items, total

    async def get_category(self, tenant_id: UUID, category_id: UUID) -> Category:
        """Get category by ID with tenant isolation."""
        result = await self.session.execute(
            select(Category).where(Category.id == category_id, Category.tenant_id == tenant_id)
        )
        category = result.scalar_one_or_none()
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        return category

    async def create_category(
        self, tenant_id: UUID, actor_id: UUID, payload: CategoryCreate
    ) -> Category:
        """Create a new category."""
        category = Category(
            tenant_id=tenant_id,
            name=payload.name,
            description=payload.description,
            slug=payload.slug,
            parent_id=payload.parent_id,
            is_active=payload.is_active,
            created_by=actor_id,
            modified_by=actor_id,
        )
        self.session.add(category)
        await self.session.commit()
        await self.session.refresh(category)
        return category

    async def update_category(
        self, tenant_id: UUID, category_id: UUID, actor_id: UUID, payload: CategoryUpdate
    ) -> Category:
        """Update an existing category."""
        category = await self.get_category(tenant_id, category_id)

        # Validate slug uniqueness if slug is being updated
        if payload.slug and payload.slug != category.slug:
            existing = await self.session.execute(
                select(Category).where(Category.slug == payload.slug, Category.tenant_id == tenant_id)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Category with slug '{payload.slug}' already exists",
                )

        # Update fields
        if payload.name is not None:
            category.name = payload.name
        if payload.description is not None:
            category.description = payload.description
        if payload.slug is not None:
            category.slug = payload.slug
        if payload.parent_id is not None:
            category.parent_id = payload.parent_id
        if payload.is_active is not None:
            category.is_active = payload.is_active

        category.modified_by = actor_id

        await self.session.commit()
        await self.session.refresh(category)
        return category

