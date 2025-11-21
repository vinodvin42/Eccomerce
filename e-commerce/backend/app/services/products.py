"""Product service layer."""

from __future__ import annotations

from decimal import Decimal
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


class ProductService:
    """Encapsulates catalog operations with tenant isolation."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_products(
        self,
        tenant_id: UUID,
        page: int,
        page_size: int,
        search: str | None = None,
    ) -> tuple[Sequence[Product], int]:
        # Try cache first
        from app.core.cache import cache_service

        cache_key = f"products:{tenant_id}:{page}:{page_size}:{search or ''}"
        cached = await cache_service.get(cache_key)
        if cached:
            # Reconstruct products from cached data (simplified - in production, cache full objects)
            # For now, skip cache for products list to avoid complexity
            pass

        query = select(Product).where(Product.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(Product).where(Product.tenant_id == tenant_id)

        if search:
            search_pattern = f"%{search.lower()}%"
            query = query.where(func.lower(Product.name).like(search_pattern))
            count_stmt = count_stmt.where(func.lower(Product.name).like(search_pattern))

        query = query.order_by(Product.created_date.desc()).offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        items = result.scalars().all()

        total = (await self.session.execute(count_stmt)).scalar_one()
        return items, total

    async def create_product(self, tenant_id: UUID, actor_id: UUID, payload: ProductCreate) -> Product:
        # Validation: Price must be positive
        if payload.price.amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product price must be greater than zero",
            )

        # Validation: Inventory must be non-negative
        if payload.inventory < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inventory cannot be negative",
            )

        # Validation: SKU uniqueness within tenant
        existing = await self.session.execute(
            select(Product).where(Product.sku == payload.sku, Product.tenant_id == tenant_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with SKU '{payload.sku}' already exists",
            )

        product = Product(
            tenant_id=tenant_id,
            name=payload.name,
            sku=payload.sku,
            description=payload.description,
            price_currency=payload.price.currency,
            price_amount=payload.price.amount,
            inventory=payload.inventory,
            image_url=payload.image_url,
            category_id=payload.category_id,
            weight=Decimal(str(payload.weight)) if payload.weight else None,
            material=payload.material,
            purity=payload.purity,
            stone_type=payload.stone_type,
            size=payload.size,
            brand=payload.brand,
            color=payload.color,
            certification=payload.certification,
            warranty_period=payload.warranty_period,
            origin=payload.origin,
            hsn_code=payload.hsn_code,
            stone_weight=Decimal(str(payload.stone_weight)) if payload.stone_weight else None,
            gross_weight=Decimal(str(payload.gross_weight)) if payload.gross_weight else None,
            rate_per_gram=Decimal(str(payload.rate_per_gram)) if payload.rate_per_gram else None,
            gender=payload.gender,
            ready_to_deliver=payload.ready_to_deliver,
            group=payload.group,
            wastage_percent=Decimal(str(payload.wastage_percent)) if payload.wastage_percent else None,
            metal_value=Decimal(str(payload.metal_value)) if payload.metal_value else None,
            wastage_value=Decimal(str(payload.wastage_value)) if payload.wastage_value else None,
            making_charges=Decimal(str(payload.making_charges)) if payload.making_charges else None,
            stone_charges=Decimal(str(payload.stone_charges)) if payload.stone_charges else None,
            gst_percent=Decimal(str(payload.gst_percent)) if payload.gst_percent else None,
            created_by=actor_id,
            modified_by=actor_id,
        )
        self.session.add(product)
        await self.session.commit()
        await self.session.refresh(product)

        # Invalidate product cache
        from app.core.cache import cache_service

        await cache_service.invalidate_product(str(tenant_id))

        # Publish product.created event
        from app.core.events import publish_product_created

        publish_product_created(
            product_id=product.id,
            tenant_id=tenant_id,
            sku=product.sku,
            name=product.name,
        )

        return product

    async def get_product(self, tenant_id: UUID, product_id: UUID) -> Product:
        """Get product by ID with tenant isolation."""
        result = await self.session.execute(
            select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
        )
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return product

    async def update_product(
        self, tenant_id: UUID, product_id: UUID, actor_id: UUID, payload: ProductUpdate
    ) -> Product:
        """Update an existing product."""
        product = await self.get_product(tenant_id, product_id)

        # Validate SKU uniqueness if SKU is being updated
        if payload.sku and payload.sku != product.sku:
            existing = await self.session.execute(
                select(Product).where(Product.sku == payload.sku, Product.tenant_id == tenant_id)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Product with SKU '{payload.sku}' already exists",
                )

        # Validation: Price must be positive if being updated
        if payload.price and payload.price.amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product price must be greater than zero",
            )

        # Validation: Inventory must be non-negative if being updated
        if payload.inventory is not None and payload.inventory < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inventory cannot be negative",
            )

        # Update fields
        if payload.name is not None:
            product.name = payload.name
        if payload.sku is not None:
            product.sku = payload.sku
        if payload.description is not None:
            product.description = payload.description
        if payload.price is not None:
            product.price_currency = payload.price.currency
            product.price_amount = payload.price.amount
        if payload.inventory is not None:
            product.inventory = payload.inventory
        if payload.image_url is not None:
            product.image_url = payload.image_url
        if payload.category_id is not None:
            product.category_id = payload.category_id
        
        # Update jewelry-specific fields
        if payload.weight is not None:
            product.weight = Decimal(str(payload.weight))
        if payload.material is not None:
            product.material = payload.material
        if payload.purity is not None:
            product.purity = payload.purity
        if payload.stone_type is not None:
            product.stone_type = payload.stone_type
        if payload.size is not None:
            product.size = payload.size
        if payload.brand is not None:
            product.brand = payload.brand
        if payload.color is not None:
            product.color = payload.color
        if payload.certification is not None:
            product.certification = payload.certification
        if payload.warranty_period is not None:
            product.warranty_period = payload.warranty_period
        if payload.origin is not None:
            product.origin = payload.origin
        if payload.hsn_code is not None:
            product.hsn_code = payload.hsn_code
        if payload.stone_weight is not None:
            product.stone_weight = Decimal(str(payload.stone_weight))
        if payload.gross_weight is not None:
            product.gross_weight = Decimal(str(payload.gross_weight))
        if payload.rate_per_gram is not None:
            product.rate_per_gram = Decimal(str(payload.rate_per_gram))
        if payload.gender is not None:
            product.gender = payload.gender
        if payload.ready_to_deliver is not None:
            product.ready_to_deliver = payload.ready_to_deliver
        if payload.group is not None:
            product.group = payload.group
        if payload.wastage_percent is not None:
            product.wastage_percent = Decimal(str(payload.wastage_percent))
        if payload.metal_value is not None:
            product.metal_value = Decimal(str(payload.metal_value))
        if payload.wastage_value is not None:
            product.wastage_value = Decimal(str(payload.wastage_value))
        if payload.making_charges is not None:
            product.making_charges = Decimal(str(payload.making_charges))
        if payload.stone_charges is not None:
            product.stone_charges = Decimal(str(payload.stone_charges))
        if payload.gst_percent is not None:
            product.gst_percent = Decimal(str(payload.gst_percent))

        product.modified_by = actor_id

        await self.session.commit()
        await self.session.refresh(product)

        # Invalidate product cache
        from app.core.cache import cache_service

        await cache_service.invalidate_product(str(tenant_id))

        return product

    async def reserve_inventory(self, tenant_id: UUID, product_id: UUID, quantity: int) -> Product:
        """Reserve inventory safely, preventing oversell."""
        result = await self.session.execute(
            select(Product)
            .where(Product.id == product_id, Product.tenant_id == tenant_id)
            .with_for_update()
        )
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        if product.inventory < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient inventory. Available: {product.inventory}, Requested: {quantity}",
            )

        product.inventory -= quantity

        await self.session.commit()
        await self.session.refresh(product)

        return product

