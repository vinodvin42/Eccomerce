"""Product API routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_request_actor
from app.core.tenant import TenantContext, get_tenant_context
from app.db.models.product import Product
from app.db.session import get_session
from app.schemas.product import ProductCreate, ProductListResponse, ProductRead, ProductUpdate
from app.schemas.shared import Money
from app.services.products import ProductService

router = APIRouter(prefix="/api/v1/products", tags=["Products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200, alias="pageSize"),
    search: str | None = None,
):
    service = ProductService(session)
    products, total = await service.list_products(
        tenant_id=tenant.tenant_id, page=page, page_size=page_size, search=search
    )
    return ProductListResponse(
        items=[serialize_product(product) for product in products],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: UUID,
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
):
    """Get product by ID."""
    service = ProductService(session)
    product = await service.get_product(tenant.tenant_id, product_id)
    return serialize_product(product)


@router.post("", response_model=ProductRead, status_code=201)
async def create_product(
    payload: ProductCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    service = ProductService(session)
    product = await service.create_product(tenant.tenant_id, actor_id, payload)
    return serialize_product(product)


@router.put("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Update an existing product."""
    service = ProductService(session)
    product = await service.update_product(tenant.tenant_id, product_id, actor_id, payload)
    return serialize_product(product)


def serialize_product(product: Product) -> ProductRead:
    return ProductRead(
        id=product.id,
        name=product.name,
        sku=product.sku,
        description=product.description,
        price=Money(currency=product.price_currency, amount=float(product.price_amount)),
        inventory=product.inventory,
        image_url=product.image_url,
        category_id=product.category_id,
        tenant_id=product.tenant_id,
        weight=float(product.weight) if product.weight else None,
        material=product.material,
        purity=product.purity,
        stoneType=product.stone_type,
        size=product.size,
        brand=product.brand,
        color=product.color,
        certification=product.certification,
        warrantyPeriod=product.warranty_period,
        origin=product.origin,
        hsnCode=product.hsn_code,
        stoneWeight=float(product.stone_weight) if product.stone_weight else None,
        grossWeight=float(product.gross_weight) if product.gross_weight else None,
        ratePerGram=float(product.rate_per_gram) if product.rate_per_gram else None,
        gender=product.gender,
        readyToDeliver=product.ready_to_deliver,
        group=product.group,
        wastagePercent=float(product.wastage_percent) if product.wastage_percent else None,
        metalValue=float(product.metal_value) if product.metal_value else None,
        wastageValue=float(product.wastage_value) if product.wastage_value else None,
        makingCharges=float(product.making_charges) if product.making_charges else None,
        stoneCharges=float(product.stone_charges) if product.stone_charges else None,
        gstPercent=float(product.gst_percent) if product.gst_percent else None,
        audit={
            "created_by": product.created_by,
            "created_date": product.created_date,
            "modified_by": product.modified_by,
            "modified_date": product.modified_date,
        },
    )

