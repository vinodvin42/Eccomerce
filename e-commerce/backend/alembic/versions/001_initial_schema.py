"""Initial schema

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create tenants table
    op.create_table(
        'tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=128), nullable=False),
        sa.Column('status', sa.Enum('Active', 'Suspended', name='tenantstatus'), nullable=False, server_default='Active'),
        sa.Column('primary_contact', sa.String(length=255), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('modified_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('modified_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug'),
    )
    op.create_index('ix_tenants_name', 'tenants', ['name'], unique=True)
    op.create_index('ix_tenants_slug', 'tenants', ['slug'], unique=True)

    # Create products table
    op.create_table(
        'products',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('sku', sa.String(length=64), nullable=False),
        sa.Column('description', sa.String(length=2000), nullable=True),
        sa.Column('price_currency', sa.String(length=3), nullable=False),
        sa.Column('price_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('inventory', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('modified_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('modified_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('sku'),
    )
    op.create_index('ix_products_tenant_id', 'products', ['tenant_id'], unique=False)
    op.create_index('ix_products_sku', 'products', ['sku'], unique=True)

    # Create orders table
    op.create_table(
        'orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('payment_method_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('shipping_address', sa.String(length=1024), nullable=True),
        sa.Column('status', sa.Enum('PendingPayment', 'Confirmed', 'Cancelled', name='orderstatus'), nullable=False, server_default='PendingPayment'),
        sa.Column('total_currency', sa.String(length=3), nullable=False),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('modified_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('modified_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_orders_tenant_id', 'orders', ['tenant_id'], unique=False)

    # Create order_items table
    op.create_table(
        'order_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price_currency', sa.String(length=3), nullable=False),
        sa.Column('unit_price_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('modified_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('modified_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
    )
    op.create_index('ix_order_items_tenant_id', 'order_items', ['tenant_id'], unique=False)
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_order_items_order_id', table_name='order_items')
    op.drop_index('ix_order_items_tenant_id', table_name='order_items')
    op.drop_table('order_items')
    op.drop_index('ix_orders_tenant_id', table_name='orders')
    op.drop_table('orders')
    op.drop_index('ix_products_sku', table_name='products')
    op.drop_index('ix_products_tenant_id', table_name='products')
    op.drop_table('products')
    op.drop_index('ix_tenants_slug', table_name='tenants')
    op.drop_index('ix_tenants_name', table_name='tenants')
    op.drop_table('tenants')
    sa.Enum(name='orderstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='tenantstatus').drop(op.get_bind(), checkfirst=True)

