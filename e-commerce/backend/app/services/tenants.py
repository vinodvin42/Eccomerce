"""Tenant service."""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.category import Category
from app.db.models.payment_method import PaymentMethod, PaymentMethodType
from app.db.models.shipping_method import ShippingMethod
from app.db.models.tenant import Tenant, TenantStatus
from app.db.models.user import AuthProvider, User, UserRole, UserStatus
from app.schemas.tenant import TenantCreate, TenantOnboardingRequest
from app.services.auth import AuthService


class TenantService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_tenant(self, actor_id: UUID, payload: TenantCreate) -> Tenant:
        existing = await self.session.execute(
            select(Tenant).where((Tenant.name == payload.name) | (Tenant.slug == payload.slug))
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Tenant with same name/slug exists."
            )
        tenant = Tenant(
            name=payload.name,
            slug=payload.slug,
            primary_contact=payload.primary_contact,
            status=TenantStatus.active,
            created_by=actor_id,
            modified_by=actor_id,
        )
        self.session.add(tenant)
        await self.session.commit()
        await self.session.refresh(tenant)
        return tenant

    async def onboard_tenant(self, actor_id: UUID, payload: TenantOnboardingRequest) -> dict:
        """Create tenant with admin user and initial setup in a single transaction."""
        # Check if tenant already exists
        existing_tenant = await self.session.execute(
            select(Tenant).where((Tenant.name == payload.tenant_name) | (Tenant.slug == payload.tenant_slug))
        )
        if existing_tenant.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Tenant with same name or slug already exists.",
            )

        # Check if admin user already exists
        existing_user = await self.session.execute(
            select(User).where(
                (User.email == payload.admin_email) | (User.username == payload.admin_username)
            )
        )
        if existing_user.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with same email or username already exists.",
            )

        # Create tenant
        tenant = Tenant(
            name=payload.tenant_name,
            slug=payload.tenant_slug,
            primary_contact=payload.primary_contact,
            status=TenantStatus.active,
            created_by=actor_id,
            modified_by=actor_id,
        )
        self.session.add(tenant)
        await self.session.flush()  # Flush to get tenant.id

        # Create admin user
        auth_service = AuthService(self.session)
        admin_user = await auth_service.create_local_user(
            email=payload.admin_email,
            username=payload.admin_username,
            password=payload.admin_password,
            full_name=payload.admin_full_name,
            role=UserRole.tenant_admin,
            tenant_id=tenant.id,
            actor_id=actor_id,
        )

        # Setup default catalog if requested
        if payload.setup_default_catalog:
            default_categories = [
                {"name": "Rings", "slug": "rings", "description": "Beautiful rings collection"},
                {"name": "Necklaces", "slug": "necklaces", "description": "Elegant necklaces"},
                {"name": "Earrings", "slug": "earrings", "description": "Stylish earrings"},
                {"name": "Bracelets", "slug": "bracelets", "description": "Charming bracelets"},
                {"name": "Bangles", "slug": "bangles", "description": "Traditional bangles"},
                {"name": "Pendants", "slug": "pendants", "description": "Exquisite pendants"},
                {"name": "Mangalsutra", "slug": "mangalsutra", "description": "Traditional mangalsutra"},
            ]
            for cat_data in default_categories:
                category = Category(
                    tenant_id=tenant.id,
                    name=cat_data["name"],
                    slug=cat_data["slug"],
                    description=cat_data["description"],
                    is_active=True,
                    created_by=actor_id,
                    modified_by=actor_id,
                )
                self.session.add(category)

        # Setup default payment methods if requested
        if payload.setup_default_payment_methods:
            default_payment_methods = [
                {
                    "name": "Credit Card",
                    "type": PaymentMethodType.credit_card,
                    "description": "Pay with credit card",
                    "requires_processing": True,
                    "processing_fee_percentage": 2.5,
                },
                {
                    "name": "Debit Card",
                    "type": PaymentMethodType.debit_card,
                    "description": "Pay with debit card",
                    "requires_processing": True,
                    "processing_fee_percentage": 1.5,
                },
                {
                    "name": "Cash on Delivery",
                    "type": PaymentMethodType.cash_on_delivery,
                    "description": "Pay when you receive",
                    "requires_processing": False,
                },
            ]
            for pm_data in default_payment_methods:
                payment_method = PaymentMethod(
                    tenant_id=tenant.id,
                    name=pm_data["name"],
                    type=pm_data["type"],
                    description=pm_data["description"],
                    is_active=True,
                    requires_processing=pm_data.get("requires_processing", False),
                    processing_fee_percentage=pm_data.get("processing_fee_percentage"),
                    created_by=actor_id,
                    modified_by=actor_id,
                )
                self.session.add(payment_method)

        # Setup default shipping methods if requested
        if payload.setup_default_shipping_methods:
            default_shipping_methods = [
                {
                    "name": "Standard Shipping",
                    "description": "5-7 business days",
                    "estimated_days_min": 5,
                    "estimated_days_max": 7,
                    "base_cost_amount": 5.00,
                    "base_cost_currency": "INR",
                },
                {
                    "name": "Express Shipping",
                    "description": "2-3 business days",
                    "estimated_days_min": 2,
                    "estimated_days_max": 3,
                    "base_cost_amount": 15.00,
                    "base_cost_currency": "INR",
                    "is_express": True,
                },
            ]
            for sm_data in default_shipping_methods:
                shipping_method = ShippingMethod(
                    tenant_id=tenant.id,
                    name=sm_data["name"],
                    description=sm_data["description"],
                    estimated_days_min=sm_data.get("estimated_days_min"),
                    estimated_days_max=sm_data.get("estimated_days_max"),
                    base_cost_amount=sm_data["base_cost_amount"],
                    base_cost_currency=sm_data["base_cost_currency"],
                    is_active=True,
                    is_express=sm_data.get("is_express", False),
                    created_by=actor_id,
                    modified_by=actor_id,
                )
                self.session.add(shipping_method)

        # Commit all changes
        await self.session.commit()
        await self.session.refresh(tenant)

        return {
            "tenant": tenant,
            "admin_user_id": admin_user.id,
            "admin_email": admin_user.email,
        }

    async def list_tenants(self) -> list[Tenant]:
        result = await self.session.execute(select(Tenant).order_by(Tenant.created_date.desc()))
        return list(result.scalars().all())

    async def get_tenant(self, tenant_id: UUID) -> Tenant:
        result = await self.session.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found.")
        return tenant

