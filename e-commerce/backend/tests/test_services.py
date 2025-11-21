"""Tests for service layer."""

from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest

from app.db.models.product import Product
from app.services.products import ProductService


@pytest.mark.asyncio
async def test_product_service_list_products(db_session, test_tenant, admin_user) -> None:
    """Test ProductService.list_products."""
    # Create some products
    for i in range(5):
        product = Product(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name=f"Product {i}",
            sku=f"SKU-{i:03d}",
            price_currency="USD",
            price_amount=Decimal(f"{10 + i}.00"),
            inventory=10,
            created_by=admin_user.id,
            modified_by=admin_user.id,
        )
        db_session.add(product)
    await db_session.commit()

    service = ProductService(db_session)
    products, total = await service.list_products(test_tenant.id, page=1, page_size=10)

    assert len(products) == 5
    assert total == 5


@pytest.mark.asyncio
async def test_product_service_create_product(db_session, test_tenant, admin_user) -> None:
    """Test ProductService.create_product."""
    from app.schemas.product import ProductCreate
    from app.schemas.shared import Money

    service = ProductService(db_session)
    product_create = ProductCreate(
        name="New Product",
        sku="NEW-001",
        description="A new product",
        price=Money(currency="USD", amount=99.99),
        inventory=50,
    )

    product = await service.create_product(test_tenant.id, admin_user.id, product_create)

    assert product.name == "New Product"
    assert product.sku == "NEW-001"
    assert product.price_amount == Decimal("99.99")
    assert product.inventory == 50


@pytest.mark.asyncio
async def test_product_service_get_product(db_session, test_tenant, admin_user) -> None:
    """Test ProductService.get_product."""
    # Create a product
    product = Product(
        id=uuid4(),
        tenant_id=test_tenant.id,
        name="Get Test Product",
        sku="GET-TEST-001",
        price_currency="USD",
        price_amount=Decimal("25.00"),
        inventory=10,
        created_by=admin_user.id,
        modified_by=admin_user.id,
    )
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)

    service = ProductService(db_session)
    retrieved = await service.get_product(test_tenant.id, product.id)

    assert retrieved.id == product.id
    assert retrieved.name == "Get Test Product"


@pytest.mark.asyncio
async def test_product_service_reserve_inventory(db_session, test_tenant, admin_user) -> None:
    """Test ProductService.reserve_inventory."""
    # Create a product with inventory
    product = Product(
        id=uuid4(),
        tenant_id=test_tenant.id,
        name="Inventory Test",
        sku="INV-TEST-001",
        price_currency="USD",
        price_amount=Decimal("15.00"),
        inventory=10,
        created_by=admin_user.id,
        modified_by=admin_user.id,
    )
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)

    service = ProductService(db_session)
    updated = await service.reserve_inventory(test_tenant.id, product.id, quantity=3)

    assert updated.inventory == 7  # 10 - 3 = 7


@pytest.mark.asyncio
async def test_product_service_reserve_inventory_insufficient(db_session, test_tenant, admin_user) -> None:
    """Test ProductService.reserve_inventory with insufficient stock."""
    from fastapi import HTTPException

    # Create a product with low inventory
    product = Product(
        id=uuid4(),
        tenant_id=test_tenant.id,
        name="Low Stock",
        sku="LOW-001",
        price_currency="USD",
        price_amount=Decimal("20.00"),
        inventory=2,
        created_by=admin_user.id,
        modified_by=admin_user.id,
    )
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)

    service = ProductService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        await service.reserve_inventory(test_tenant.id, product.id, quantity=5)

    assert exc_info.value.status_code == 400

