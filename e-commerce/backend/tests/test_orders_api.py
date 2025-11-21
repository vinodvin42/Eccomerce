"""Tests for orders API endpoints."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.db.models.order import OrderStatus
from app.db.models.product import Product


@pytest.mark.asyncio
async def test_create_order(client: AsyncClient, test_tenant, test_user, admin_user, db_session) -> None:
    """Test creating an order."""
    # Create a product first
    product = Product(
        id=uuid4(),
        tenant_id=test_tenant.id,
        name="Test Product",
        sku="ORDER-TEST-001",
        price_currency="USD",
        price_amount=25.00,
        inventory=10,
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
            "username": test_user.username,
            "password": "testpass123",
        },
    )
    token = login_response.json()["access_token"]

    # Create order
    response = await client.post(
        "/api/v1/orders",
        json={
            "customer_id": str(test_user.id),
            "payment_method_id": str(uuid4()),
            "shipping_address": "123 Test St, Test City, TC 12345",
            "items": [
                {
                    "product_id": str(product.id),
                    "quantity": 2,
                    "unit_price": {"currency": "USD", "amount": 25.00},
                }
            ],
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(test_tenant.id),
            "X-Actor-ID": str(test_user.id),
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == OrderStatus.pending_payment.value
    assert len(data["items"]) == 1
    assert data["total"]["amount"] == 50.00


@pytest.mark.asyncio
async def test_list_orders(client: AsyncClient, test_tenant, test_user) -> None:
    """Test listing orders."""
    # Login to get token
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": test_user.username,
            "password": "testpass123",
        },
    )
    token = login_response.json()["access_token"]

    response = await client.get(
        "/api/v1/orders",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(test_tenant.id),
            "X-Actor-ID": str(test_user.id),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_order(client: AsyncClient, test_tenant, test_user, admin_user, db_session) -> None:
    """Test getting an order by ID."""
    from app.db.models.order import Order, OrderItem

    # Create a product
    product = Product(
        id=uuid4(),
        tenant_id=test_tenant.id,
        name="Test Product",
        sku="GET-ORDER-001",
        price_currency="USD",
        price_amount=30.00,
        inventory=5,
        created_by=admin_user.id,
        modified_by=admin_user.id,
    )
    db_session.add(product)
    await db_session.commit()

    # Create an order directly
    order = Order(
        id=uuid4(),
        tenant_id=test_tenant.id,
        customer_id=test_user.id,
        payment_method_id=uuid4(),
        status=OrderStatus.pending_payment,
        total_currency="USD",
        total_amount=30.00,
        created_by=test_user.id,
        modified_by=test_user.id,
    )
    db_session.add(order)
    await db_session.flush()

    order_item = OrderItem(
        id=uuid4(),
        tenant_id=test_tenant.id,
        order_id=order.id,
        product_id=product.id,
        quantity=1,
        unit_price_currency="USD",
        unit_price_amount=30.00,
        created_by=test_user.id,
        modified_by=test_user.id,
    )
    db_session.add(order_item)
    await db_session.commit()
    await db_session.refresh(order)

    # Login to get token
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": test_user.username,
            "password": "testpass123",
        },
    )
    token = login_response.json()["access_token"]

    # Get order
    response = await client.get(
        f"/api/v1/orders/{order.id}",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(test_tenant.id),
            "X-Actor-ID": str(test_user.id),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(order.id)
    assert data["status"] == OrderStatus.pending_payment.value


@pytest.mark.asyncio
async def test_create_order_insufficient_inventory(client: AsyncClient, test_tenant, test_user, admin_user, db_session) -> None:
    """Test creating order with insufficient inventory fails."""
    # Create a product with low inventory
    product = Product(
        id=uuid4(),
        tenant_id=test_tenant.id,
        name="Low Stock Product",
        sku="LOW-STOCK-001",
        price_currency="USD",
        price_amount=10.00,
        inventory=1,  # Only 1 in stock
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
            "username": test_user.username,
            "password": "testpass123",
        },
    )
    token = login_response.json()["access_token"]

    # Try to order more than available
    response = await client.post(
        "/api/v1/orders",
        json={
            "customer_id": str(test_user.id),
            "payment_method_id": str(uuid4()),
            "items": [
                {
                    "product_id": str(product.id),
                    "quantity": 5,  # More than available
                    "unit_price": {"currency": "USD", "amount": 10.00},
                }
            ],
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(test_tenant.id),
            "X-Actor-ID": str(test_user.id),
        },
    )
    assert response.status_code == 400
    assert "insufficient" in response.json()["detail"].lower() or "inventory" in response.json()["detail"].lower()

