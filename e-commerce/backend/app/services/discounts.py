"""Discount service."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.discount import Discount, DiscountScope, DiscountStatus, DiscountType
from app.schemas.discount import DiscountCreate, DiscountUpdate


class DiscountService:
    """Service for managing discounts and promotions."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_discount(self, tenant_id: UUID, actor_id: UUID, payload: DiscountCreate) -> Discount:
        """Create a new discount."""
        # Check if code already exists
        existing = await self.session.execute(
            select(Discount).where(
                Discount.code == payload.code.upper(),
                Discount.tenant_id == tenant_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Discount code '{payload.code}' already exists.",
            )

        # Validate scope-specific fields
        # Support both product_id (single) and product_ids (multiple) for backward compatibility
        product_ids_list = payload.product_ids or ([payload.product_id] if payload.product_id else [])
        if payload.scope == DiscountScope.product and not product_ids_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="productId or productIds is required when scope is Product",
            )
        if payload.scope == DiscountScope.category and not payload.category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="category_id is required when scope is Category",
            )

        # Validate discount value
        if payload.discount_type in (DiscountType.percentage, DiscountType.fixed_amount) and not payload.discount_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="discount_value is required for percentage and fixed_amount discounts",
            )

        # Store product_ids as JSON array, and also set product_id for backward compatibility (first product)
        product_ids_list = payload.product_ids or ([payload.product_id] if payload.product_id else None)
        first_product_id = product_ids_list[0] if product_ids_list else None
        
        discount = Discount(
            tenant_id=tenant_id,
            code=payload.code.upper(),
            name=payload.name,
            description=payload.description,
            discount_type=payload.discount_type,
            discount_value=payload.discount_value,
            discount_currency=payload.discount_currency,
            scope=payload.scope,
            product_id=first_product_id,  # For backward compatibility
            product_ids=[str(pid) for pid in product_ids_list] if product_ids_list else None,  # Store as string array in JSON (UUIDs as strings)
            category_id=payload.category_id,
            valid_from=payload.valid_from,
            valid_until=payload.valid_until,
            max_uses=payload.max_uses,
            max_uses_per_customer=payload.max_uses_per_customer,
            minimum_order_amount=payload.minimum_order_amount,
            minimum_order_currency=payload.minimum_order_currency,
            is_active=payload.is_active,
            status=DiscountStatus.active,
            current_uses=0,
            created_by=actor_id,
            modified_by=actor_id,
        )
        self.session.add(discount)
        await self.session.commit()
        await self.session.refresh(discount)
        return discount

    async def list_discounts(
        self,
        tenant_id: UUID,
        page: int = 1,
        page_size: int = 20,
        is_active: bool | None = None,
        status: DiscountStatus | None = None,
    ) -> tuple[list[Discount], int]:
        """List discounts with pagination."""
        query = select(Discount).where(Discount.tenant_id == tenant_id)

        if is_active is not None:
            query = query.where(Discount.is_active == is_active)

        if status is not None:
            query = query.where(Discount.status == status)

        # Update status based on validity dates
        now = datetime.now(timezone.utc)
        expired_discounts = await self.session.execute(
            select(Discount).where(
                Discount.tenant_id == tenant_id,
                Discount.valid_until.isnot(None),
                Discount.valid_until < now,
                Discount.status == DiscountStatus.active,
            )
        )
        for disc in expired_discounts.scalars():
            disc.status = DiscountStatus.expired
            disc.is_active = False

        await self.session.commit()

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        query = query.order_by(Discount.created_date.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_discount(self, tenant_id: UUID, discount_id: UUID) -> Discount:
        """Get a discount by ID."""
        result = await self.session.execute(
            select(Discount).where(Discount.id == discount_id, Discount.tenant_id == tenant_id)
        )
        discount = result.scalar_one_or_none()
        if not discount:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discount not found.")
        return discount

    async def get_discount_by_code(self, tenant_id: UUID, code: str) -> Discount:
        """Get a discount by code."""
        result = await self.session.execute(
            select(Discount).where(
                Discount.code == code.upper(),
                Discount.tenant_id == tenant_id,
            )
        )
        discount = result.scalar_one_or_none()
        if not discount:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discount code not found.")
        return discount

    async def update_discount(
        self, tenant_id: UUID, discount_id: UUID, actor_id: UUID, payload: DiscountUpdate
    ) -> Discount:
        """Update a discount."""
        discount = await self.get_discount(tenant_id, discount_id)

        # Update fields
        if payload.name is not None:
            discount.name = payload.name
        if payload.description is not None:
            discount.description = payload.description
        if payload.discount_type is not None:
            discount.discount_type = payload.discount_type
        if payload.discount_value is not None:
            discount.discount_value = payload.discount_value
        if payload.discount_currency is not None:
            discount.discount_currency = payload.discount_currency
        if payload.scope is not None:
            discount.scope = payload.scope
        if payload.product_id is not None or payload.product_ids is not None:
            # Support both product_id (single) and product_ids (multiple)
            product_ids_list = payload.product_ids or ([payload.product_id] if payload.product_id else None)
            if product_ids_list:
                discount.product_ids = [str(pid) for pid in product_ids_list]  # Store as string array in JSON
                discount.product_id = product_ids_list[0]  # For backward compatibility
            else:
                discount.product_ids = None
                discount.product_id = None
        if payload.category_id is not None:
            discount.category_id = payload.category_id
        if payload.valid_from is not None:
            discount.valid_from = payload.valid_from
        if payload.valid_until is not None:
            discount.valid_until = payload.valid_until
        if payload.max_uses is not None:
            discount.max_uses = payload.max_uses
        if payload.max_uses_per_customer is not None:
            discount.max_uses_per_customer = payload.max_uses_per_customer
        if payload.minimum_order_amount is not None:
            discount.minimum_order_amount = payload.minimum_order_amount
        if payload.minimum_order_currency is not None:
            discount.minimum_order_currency = payload.minimum_order_currency
        if payload.is_active is not None:
            discount.is_active = payload.is_active

        discount.modified_by = actor_id

        await self.session.commit()
        await self.session.refresh(discount)
        return discount

    async def apply_discount(
        self, tenant_id: UUID, code: str, order_amount: Decimal, order_currency: str, customer_id: UUID | None = None
    ) -> tuple[Discount, Decimal]:
        """Apply a discount code and return the discount amount."""
        discount = await self.get_discount_by_code(tenant_id, code)

        now = datetime.now(timezone.utc)

        # Check if discount is active
        if not discount.is_active or discount.status != DiscountStatus.active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discount is not active.")

        # Check validity period
        if discount.valid_from > now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discount is not yet valid.")
        if discount.valid_until and discount.valid_until < now:
            discount.status = DiscountStatus.expired
            discount.is_active = False
            await self.session.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discount has expired.")

        # Check usage limits
        if discount.max_uses and discount.current_uses >= discount.max_uses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discount usage limit reached.")

        # Check minimum order amount
        if discount.minimum_order_amount:
            if discount.minimum_order_currency != order_currency:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Order currency does not match discount minimum order currency.",
                )
            if order_amount < discount.minimum_order_amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Order amount must be at least {discount.minimum_order_amount} {order_currency}.",
                )

        # Calculate discount amount
        discount_amount = Decimal("0")
        if discount.discount_type == DiscountType.percentage:
            if discount.discount_value:
                discount_amount = order_amount * (discount.discount_value / Decimal("100"))
        elif discount.discount_type == DiscountType.fixed_amount:
            discount_amount = discount.discount_value or Decimal("0")
            if discount.discount_currency != order_currency:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Discount currency does not match order currency.",
                )
        elif discount.discount_type == DiscountType.free_shipping:
            # Free shipping is handled separately in order processing
            discount_amount = Decimal("0")

        # Ensure discount doesn't exceed order amount
        if discount_amount > order_amount:
            discount_amount = order_amount

        # Increment usage count
        discount.current_uses += 1
        if discount.max_uses and discount.current_uses >= discount.max_uses:
            discount.is_active = False
            discount.status = DiscountStatus.inactive

        await self.session.commit()
        await self.session.refresh(discount)

        return discount, discount_amount

    async def delete_discount(self, tenant_id: UUID, discount_id: UUID) -> None:
        """Delete a discount (soft delete by deactivating)."""
        discount = await self.get_discount(tenant_id, discount_id)
        discount.is_active = False
        discount.status = DiscountStatus.inactive
        await self.session.commit()

