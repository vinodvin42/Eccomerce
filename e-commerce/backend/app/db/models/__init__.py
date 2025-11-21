"""Import all models for Alembic discovery."""

from app.db.models.audit_log import AuditAction, AuditLog
from app.db.models.category import Category
from app.db.models.discount import Discount, DiscountScope, DiscountStatus, DiscountType
from app.db.models.order import Order, OrderItem, OrderStatus
from app.db.models.payment_method import PaymentMethod, PaymentMethodType
from app.db.models.payment_transaction import PaymentProvider, PaymentStatus, PaymentTransaction
from app.db.models.product import Product
from app.db.models.shipping_method import ShippingMethod
from app.db.models.tenant import Tenant, TenantStatus
from app.db.models.user import AuthProvider, User, UserRole, UserStatus

__all__ = [
    "AuditAction",
    "AuditLog",
    "Category",
    "Discount",
    "DiscountScope",
    "DiscountStatus",
    "DiscountType",
    "Order",
    "OrderItem",
    "OrderStatus",
    "PaymentMethod",
    "PaymentMethodType",
    "PaymentProvider",
    "PaymentStatus",
    "PaymentTransaction",
    "Product",
    "ShippingMethod",
    "Tenant",
    "TenantStatus",
    "User",
    "UserRole",
    "UserStatus",
    "AuthProvider",
]
