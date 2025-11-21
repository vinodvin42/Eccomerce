"""Tests for products API endpoints."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.db.models.product import Product


@pytest.mark.asyncio
async def test_list_products(client: AsyncClient, test_tenant, admin_user) -> None:
    """Test listing products."""
    # Login to get token
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": admin_user.username,
            "password": "adminpass123",
        },
    )
    token = login_response.json()["access_token"]

    response = await client.get(
        "/api/v1/products",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(test_tenant.id),
            "X-Actor-ID": str(admin_user.id),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data


@pytest.mark.asyncio
async def test_create_product(client: AsyncClient, test_tenant, admin_user) -> None:
    """Test creating a product."""
    # Login to get token
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": admin_user.username,
            "password": "adminpass123",
        },
    )
    token = login_response.json()["access_token"]

    response = await client.post(
        "/api/v1/products",
        json={
            "name": "Test Product",
            "sku": "TEST-001",
            "description": "A test product",
            "price": {"currency": "USD", "amount": 99.99},
            "inventory": 100,
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(test_tenant.id),
            "X-Actor-ID": str(admin_user.id),
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Product"
    assert data["sku"] == "TEST-001"
    assert data["price"]["amount"] == 99.99


@pytest.mark.asyncio
async def test_get_product(client: AsyncClient, test_tenant, admin_user, db_session) -> None:
    """Test getting a product by ID."""
    from app.db.models.product import Product

    # Create a product directly
    product = Product(
        id=uuid4(),
        tenant_id=test_tenant.id,
        name="Test Product",
        sku="TEST-002",
        price_currency="USD",
        price_amount=50.00,
        inventory=50,
        created_by=admin_user.id,
        modified_by=admin_user.id,
    )
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)

    # Login to get token
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": admin_user.username,
            "password": "adminpass123",
        },
    )
    token = login_response.json()["access_token"]

    response = await client.get(
        f"/api/v1/products/{product.id}",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(test_tenant.id),
            "X-Actor-ID": str(admin_user.id),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(product.id)
    assert data["name"] == "Test Product"


@pytest.mark.asyncio
async def test_create_product_duplicate_sku(client: AsyncClient, test_tenant, admin_user, db_session) -> None:
    """Test creating product with duplicate SKU fails."""
    from app.db.models.product import Product

    # Create a product directly
    product = Product(
        id=uuid4(),
        tenant_id=test_tenant.id,
        name="Existing Product",
        sku="DUPLICATE-SKU",
        price_currency="USD",
        price_amount=10.00,
        inventory=10,
        created_by=admin_user.id,
        modified_by=admin_user.id,
    )
    db_session.add(product)
    await db_session.commit()

    # Login to get token
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": admin_user.username,
            "password": "adminpass123",
        },
    )
    token = login_response.json()["access_token"]

    # Try to create another product with same SKU
    response = await client.post(
        "/api/v1/products",
        json={
            "name": "Duplicate SKU Product",
            "sku": "DUPLICATE-SKU",
            "price": {"currency": "USD", "amount": 20.00},
            "inventory": 20,
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(test_tenant.id),
            "X-Actor-ID": str(admin_user.id),
        },
    )
    assert response.status_code == 409

