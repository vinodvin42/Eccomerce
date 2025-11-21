"""Comprehensive seed script for demo tenants, users, products, and orders."""

from __future__ import annotations

import asyncio
import sys
from decimal import Decimal
from pathlib import Path
from uuid import UUID, uuid4

# Ensure the app directory is in the Python path
# This allows the script to be run from any directory
_script_dir = Path(__file__).parent
_app_dir = _script_dir.parent
if str(_app_dir) not in sys.path:
    sys.path.insert(0, str(_app_dir))

import pandas as pd
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import get_settings
from app.db.models.category import Category
from app.db.models.order import Order, OrderItem
from app.db.models.payment_method import PaymentMethod, PaymentMethodType
from app.db.models.product import Product
from app.db.models.shipping_method import ShippingMethod
from app.db.models.tenant import Tenant, TenantStatus
from app.db.models.user import AuthProvider, User, UserRole, UserStatus
from app.services.auth import AuthService

PRIMARY_TENANT_SLUG = "premium-jewelry"
PRIMARY_TENANT_NAME = "Premium Jewelry"
PRIMARY_TENANT_CONTACT = "care@premiumjewelry.com"
PRIMARY_TENANT_ID = UUID("910dccc7-bc18-4d75-8329-bdc766c1097c")
PRIMARY_TENANT_ADMIN_EMAIL = "admin@premiumjewelry.com"
PRIMARY_TENANT_ADMIN_USERNAME = "premium_admin"
SUPER_ADMIN_EMAIL = "admin@premiumcommerce.com"

# Image URL mapping based on product category/type
IMAGE_URLS_BY_CATEGORY = {
    "rings": [
        "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1518544801958-efcbf8a7ec10?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1602777927000-01848f8ab216?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
    ],
    "necklaces": [
        "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
    ],
    "earrings": [
        "https://images.unsplash.com/photo-1603561596110-67a21c4e6f0a?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
    ],
    "bracelets": [
        "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1601042866501-f62b5f8b9c33?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
    ],
    "bangles": [
        "https://images.unsplash.com/photo-1518544801958-efcbf8a7ec10?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1602777927000-01848f8ab216?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop",
    ],
    "pendants": [
        "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
    ],
    "mangalsutra": [
        "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&h=500&fit=crop",
    ],
    "default": [
        "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&h=500&fit=crop",
    ],
}

# Category name to slug mapping
CATEGORY_MAPPING = {
    "ring": "rings",
    "rings": "rings",
    "necklace": "necklaces",
    "necklaces": "necklaces",
    "earring": "earrings",
    "earrings": "earrings",
    "bracelet": "bracelets",
    "bracelets": "bracelets",
    "bangle": "bangles",
    "bangles": "bangles",
    "pendant": "pendants",
    "pendants": "pendants",
    "mangalsutra": "mangalsutra",
    "mangalsutras": "mangalsutra",
}


def get_image_url(category_slug: str | None, index: int = 0) -> str:
    """Get an image URL based on category and index."""
    if category_slug and category_slug in IMAGE_URLS_BY_CATEGORY:
        urls = IMAGE_URLS_BY_CATEGORY[category_slug]
    else:
        urls = IMAGE_URLS_BY_CATEGORY["default"]
    
    return urls[index % len(urls)]


def normalize_category_name(category_name: str | None) -> str | None:
    """Normalize category name to slug."""
    if not category_name:
        return None
    
    category_lower = category_name.lower().strip()
    return CATEGORY_MAPPING.get(category_lower, None)


def read_excel_products(excel_path: str) -> list[dict]:
    """Read products from Excel file and return as list of dicts."""
    df = pd.read_excel(excel_path)
    
    # Normalize column names (handle case variations and spaces)
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
    
    print(f"📊 Found {len(df)} rows in Excel file")
    print(f"📋 Columns: {', '.join(df.columns.tolist())}")
    
    products = []
    for idx, row in df.iterrows():
        product_data = {
            "name": None,
            "sku": None,
            "description": None,
            "price": None,
            "inventory": 10,
            "category": None,
            "image_url": None,
        }
        
        # Map columns (try various common names)
        for col in df.columns:
            col_lower = col.lower()
            
            if "name" in col_lower or "product" in col_lower or "title" in col_lower:
                product_data["name"] = str(row[col]).strip() if pd.notna(row[col]) else None
            elif "sku" in col_lower or "code" in col_lower or "id" in col_lower:
                product_data["sku"] = str(row[col]).strip() if pd.notna(row[col]) else None
            elif "description" in col_lower or "desc" in col_lower or "details" in col_lower:
                product_data["description"] = str(row[col]).strip() if pd.notna(row[col]) else None
            elif "price" in col_lower or "cost" in col_lower or "amount" in col_lower:
                try:
                    price_val = row[col]
                    if pd.notna(price_val):
                        product_data["price"] = float(price_val)
                except (ValueError, TypeError):
                    pass
            elif "inventory" in col_lower or "stock" in col_lower or "quantity" in col_lower:
                try:
                    inv_val = row[col]
                    if pd.notna(inv_val):
                        product_data["inventory"] = int(inv_val)
                except (ValueError, TypeError):
                    pass
            elif "category" in col_lower or "type" in col_lower:
                product_data["category"] = str(row[col]).strip() if pd.notna(row[col]) else None
            elif "image" in col_lower or "photo" in col_lower or "picture" in col_lower:
                img_val = row[col]
                if pd.notna(img_val):
                    product_data["image_url"] = str(img_val).strip()
        
        # Skip if essential fields are missing
        if not product_data["name"] or not product_data["sku"]:
            print(f"⚠️  Skipping row {idx + 1}: missing name or SKU")
            continue
        
        # Generate SKU if missing
        if not product_data["sku"]:
            product_data["sku"] = f"PROD-{idx + 1:04d}"
        
        # Set default price if missing
        if product_data["price"] is None or product_data["price"] <= 0:
            product_data["price"] = 99.99
        
        # Normalize category
        category_slug = normalize_category_name(product_data["category"])
        
        # Assign image URL if not provided
        if not product_data["image_url"]:
            product_data["image_url"] = get_image_url(category_slug, idx)
        
        product_data["category_slug"] = category_slug
        products.append(product_data)
    
    print(f"✅ Processed {len(products)} valid products")
    return products


settings = get_settings()
engine = create_async_engine(settings.database_url, pool_pre_ping=True)
async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def seed_data() -> None:
    """Create demo tenants, users, and products."""
    async with async_session() as session:
        auth_service = AuthService(session)

        # Create super admin user (no tenant)
        super_admin_id = uuid4()
        try:
            super_admin = await auth_service.create_local_user(
                email=SUPER_ADMIN_EMAIL,
                username="superadmin",
                password="Admin123!@#",
                full_name="Super Administrator",
                role=UserRole.super_admin,
                tenant_id=None,
                actor_id=super_admin_id,
            )
            print(f"✅ Created super admin: {super_admin.email}")
        except ValueError as e:
            print(f"⚠️  Super admin may already exist: {e}")

        # Create or get primary tenant
        result = await session.execute(
            select(Tenant).where(Tenant.slug.in_([PRIMARY_TENANT_SLUG, "acme-corp"]))
        )
        existing_tenant1 = result.scalar_one_or_none()
        if existing_tenant1:
            tenant1 = existing_tenant1
            tenant1_id = tenant1.id
            tenant1.name = PRIMARY_TENANT_NAME
            tenant1.slug = PRIMARY_TENANT_SLUG
            tenant1.primary_contact = PRIMARY_TENANT_CONTACT
            tenant1.status = TenantStatus.active
            tenant1.modified_by = super_admin_id
            print(f"✅ Updated existing tenant: {tenant1.name} ({tenant1.slug})")
        else:
            tenant1_id = PRIMARY_TENANT_ID
            tenant1 = Tenant(
                id=tenant1_id,
                name=PRIMARY_TENANT_NAME,
                slug=PRIMARY_TENANT_SLUG,
                status=TenantStatus.active,
                primary_contact=PRIMARY_TENANT_CONTACT,
                created_by=super_admin_id,
                modified_by=super_admin_id,
            )
            session.add(tenant1)
            await session.flush()
            print(f"✅ Created tenant: {tenant1.name} ({tenant1.slug})")

        # Create tenant admin for tenant1
        tenant_admin1_id = uuid4()
        try:
            tenant_admin1 = await auth_service.create_local_user(
                email=PRIMARY_TENANT_ADMIN_EMAIL,
                username=PRIMARY_TENANT_ADMIN_USERNAME,
                password="Admin123!@#",
                full_name="Premium Admin",
                role=UserRole.tenant_admin,
                tenant_id=tenant1_id,
                actor_id=super_admin_id,
            )
            print(f"✅ Created tenant admin: {tenant_admin1.email}")
        except ValueError as e:
            print(f"⚠️  Tenant admin may already exist: {e}")

        # Reset tenant1 catalog/orders to avoid stale data
        print("\n🧹 Resetting existing tenant1 catalog data...")
        await session.execute(delete(OrderItem).where(OrderItem.tenant_id == tenant1_id))
        await session.execute(delete(Order).where(Order.tenant_id == tenant1_id))
        await session.execute(delete(Product).where(Product.tenant_id == tenant1_id))
        await session.execute(delete(Category).where(Category.tenant_id == tenant1_id))
        await session.flush()
        print("✅ Cleared previous tenant1 products and orders")

        # Create master data for tenant1 BEFORE creating products
        print("\n📦 Creating master data for tenant1...")
        
        # Categories - Jewelry Categories
        categories_data = [
            {"name": "Rings", "slug": "rings", "description": "Elegant rings for every occasion"},
            {"name": "Necklaces", "slug": "necklaces", "description": "Beautiful necklaces and chains"},
            {"name": "Earrings", "slug": "earrings", "description": "Stylish earrings and studs"},
            {"name": "Bracelets", "slug": "bracelets", "description": "Charming bracelets and bangles"},
            {"name": "Bangles", "slug": "bangles", "description": "Traditional and modern bangles"},
            {"name": "Pendants", "slug": "pendants", "description": "Exquisite pendants and lockets"},
            {"name": "Mangalsutra", "slug": "mangalsutra", "description": "Traditional mangalsutra designs"},
        ]
        
        created_categories = {}
        for cat_data in categories_data:
            # Check if category already exists
            result = await session.execute(
                select(Category).where(Category.slug == cat_data["slug"], Category.tenant_id == tenant1_id)
            )
            existing = result.scalar_one_or_none()
            if existing:
                created_categories[cat_data["slug"]] = existing
            else:
                category = Category(
                    tenant_id=tenant1_id,
                    name=cat_data["name"],
                    slug=cat_data["slug"],
                    description=cat_data.get("description"),
                    parent_id=None,
                    is_active=True,
                    created_by=tenant_admin1_id,
                    modified_by=tenant_admin1_id,
                )
                session.add(category)
                await session.flush()
                created_categories[cat_data["slug"]] = category
        print(f"✅ Created/Found {len(created_categories)} categories")

        # Try to read products from Excel file, fallback to hardcoded data
        excel_file = Path(__file__).parent.parent.parent / "jewellery_product_master_50_rows_v2.xlsx"
        products_data = []
        
        if excel_file.exists():
            print(f"\n📄 Reading products from Excel file: {excel_file.name}")
            try:
                products_data = read_excel_products(str(excel_file))
                print(f"✅ Loaded {len(products_data)} products from Excel")
            except Exception as e:
                print(f"⚠️  Error reading Excel file: {e}")
                print("📦 Falling back to hardcoded product data...")
                products_data = []
        
        # Fallback to hardcoded products if Excel not available or failed
        if not products_data:
            print("\n📦 Using hardcoded product data...")
            products_data = [
            {
                "name": "Diamond Solitaire Ring",
                "sku": "RING-001",
                "price": 2999.99,
                "inventory": 15,
                "description": "Exquisite diamond solitaire ring in 18K gold setting. Perfect for engagements and special occasions.",
                "image_url": "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&h=500&fit=crop",
                "category_slug": "rings",
            },
            {
                "name": "Gold Wedding Ring",
                "sku": "RING-002",
                "price": 899.99,
                "inventory": 25,
                "description": "Classic 22K gold wedding ring with intricate traditional design.",
                "image_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&h=500&fit=crop",
                "category_slug": "rings",
            },
            {
                "name": "Pearl Necklace Set",
                "sku": "NECK-001",
                "price": 1599.99,
                "inventory": 12,
                "description": "Elegant pearl necklace set with matching earrings. Premium quality cultured pearls.",
                "image_url": "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=500&h=500&fit=crop",
                "category_slug": "necklaces",
            },
            {
                "name": "Gold Chain Necklace",
                "sku": "NECK-002",
                "price": 1299.99,
                "inventory": 20,
                "description": "Beautiful 22K gold chain necklace with intricate link design. Timeless elegance.",
                "image_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop",
                "category_slug": "necklaces",
            },
            {
                "name": "Diamond Stud Earrings",
                "sku": "EARR-001",
                "price": 1999.99,
                "inventory": 18,
                "description": "Classic diamond stud earrings in platinum setting. Perfect for everyday elegance.",
                "image_url": "https://images.unsplash.com/photo-1603561596110-67a21c4e6f0a?w=500&h=500&fit=crop",
                "category_slug": "earrings",
            },
            {
                "name": "Gold Jhumka Earrings",
                "sku": "EARR-002",
                "price": 799.99,
                "inventory": 30,
                "description": "Traditional gold jhumka earrings with intricate designs. Perfect for festivals and weddings.",
                "image_url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&h=500&fit=crop",
                "category_slug": "earrings",
            },
            {
                "name": "Tennis Bracelet",
                "sku": "BRAC-001",
                "price": 2499.99,
                "inventory": 10,
                "description": "Luxurious diamond tennis bracelet in white gold. Sparkling elegance for special occasions.",
                "image_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop",
                "category_slug": "bracelets",
            },
            {
                "name": "Gold Bangles Set",
                "sku": "BANG-001",
                "price": 1199.99,
                "inventory": 22,
                "description": "Set of 4 traditional gold bangles with engraved patterns. Perfect gift set.",
                "image_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop",
                "category_slug": "bangles",
            },
            {
                "name": "Diamond Pendant",
                "sku": "PEND-001",
                "price": 1799.99,
                "inventory": 16,
                "description": "Stunning diamond pendant in white gold setting. Comes with matching chain.",
                "image_url": "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=500&h=500&fit=crop",
                "category_slug": "pendants",
            },
            {
                "name": "Traditional Mangalsutra",
                "sku": "MANG-001",
                "price": 999.99,
                "inventory": 28,
                "description": "Traditional gold mangalsutra with black beads. Classic design for married women.",
                "image_url": "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&h=500&fit=crop",
                "category_slug": "mangalsutra",
            },
            {
                "name": "Emerald Halo Ring",
                "sku": "RING-003",
                "price": 2499.99,
                "inventory": 14,
                "description": "Vibrant emerald center stone surrounded by a halo of brilliant diamonds.",
                "image_url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&h=500&fit=crop",
                "category_slug": "rings",
            },
            {
                "name": "Rose Gold Infinity Ring",
                "sku": "RING-004",
                "price": 1199.99,
                "inventory": 22,
                "description": "18K rose gold infinity ring with pavé diamonds for endless sparkle.",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
                "category_slug": "rings",
            },
            {
                "name": "Sapphire Crown Ring",
                "sku": "RING-005",
                "price": 1899.99,
                "inventory": 12,
                "description": "Regal sapphire ring with tapered diamond shoulders inspired by royal crowns.",
                "image_url": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500&h=500&fit=crop",
                "category_slug": "rings",
            },
            {
                "name": "Vintage Floral Ring",
                "sku": "RING-006",
                "price": 1399.99,
                "inventory": 18,
                "description": "Art-deco floral ring crafted in yellow gold with milgrain detailing.",
                "image_url": "https://images.unsplash.com/photo-1518544801958-efcbf8a7ec10?w=500&h=500&fit=crop",
                "category_slug": "rings",
            },
            {
                "name": "Diamond Cocktail Ring",
                "sku": "RING-007",
                "price": 3299.99,
                "inventory": 9,
                "description": "Statement cocktail ring featuring a cluster of baguette and round diamonds.",
                "image_url": "https://images.unsplash.com/photo-1602777927000-01848f8ab216?w=500&h=500&fit=crop",
                "category_slug": "rings",
            },
            {
                "name": "Heart Promise Ring",
                "sku": "RING-008",
                "price": 699.99,
                "inventory": 30,
                "description": "Delicate heart-shaped promise ring with a single sparkling diamond.",
                "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
                "category_slug": "rings",
            },
            {
                "name": "Dual Tone Cuff Bracelet",
                "sku": "BRAC-002",
                "price": 899.99,
                "inventory": 20,
                "description": "Minimal cuff bracelet blending white and yellow gold with hammered texture.",
                "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
                "category_slug": "bracelets",
            },
            {
                "name": "Pearl Charm Bracelet",
                "sku": "BRAC-003",
                "price": 659.99,
                "inventory": 25,
                "description": "Freshwater pearls accented with gold charms inspired by ocean treasures.",
                "image_url": "https://images.unsplash.com/photo-1601042866501-f62b5f8b9c33?w=500&h=500&fit=crop",
                "category_slug": "bracelets",
            },
            {
                "name": "Celestial Bangle",
                "sku": "BANG-002",
                "price": 1049.99,
                "inventory": 24,
                "description": "Celestial motif bangle with moon and star engravings filled with enamel.",
                "image_url": "https://images.unsplash.com/photo-1518544801958-efcbf8a7ec10?w=500&h=500&fit=crop",
                "category_slug": "bangles",
            },
            {
                "name": "Kada Heritage Bangles",
                "sku": "BANG-003",
                "price": 1599.99,
                "inventory": 16,
                "description": "Set of two heritage kada bangles with meenakari work and kundan stones.",
                "image_url": "https://images.unsplash.com/photo-1602777927000-01848f8ab216?w=500&h=500&fit=crop",
                "category_slug": "bangles",
            },
            {
                "name": "Lotus Filigree Bangles",
                "sku": "BANG-004",
                "price": 1349.99,
                "inventory": 20,
                "description": "Intricate lotus-inspired bangles cast in 22K gold with openwork pattern.",
                "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
                "category_slug": "bangles",
            },
            {
                "name": "Pear Drop Necklace",
                "sku": "NECK-003",
                "price": 1899.99,
                "inventory": 18,
                "description": "Y-necklace featuring pear-shaped diamonds cascading on 18K gold chain.",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
                "category_slug": "necklaces",
            },
            {
                "name": "Choker with Kundan",
                "sku": "NECK-004",
                "price": 2299.99,
                "inventory": 14,
                "description": "Traditional kundan choker embellished with emerald droplets and pearls.",
                "image_url": "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=500&h=500&fit=crop",
                "category_slug": "necklaces",
            },
            {
                "name": "Layered Coin Necklace",
                "sku": "NECK-005",
                "price": 749.99,
                "inventory": 28,
                "description": "Layered necklace with antique coin charms for boho-chic styling.",
                "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
                "category_slug": "necklaces",
            },
            {
                "name": "Cascade Diamond Necklace",
                "sku": "NECK-006",
                "price": 3899.99,
                "inventory": 8,
                "description": "Graduated cascade of brilliant diamonds perfect for gala evenings.",
                "image_url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&h=500&fit=crop",
                "category_slug": "necklaces",
            },
            {
                "name": "Infinity Pendant",
                "sku": "PEND-002",
                "price": 999.99,
                "inventory": 26,
                "description": "Symbolic infinity pendant with alternating diamonds and sapphires.",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
                "category_slug": "pendants",
            },
            {
                "name": "Lotus Mandala Pendant",
                "sku": "PEND-003",
                "price": 1199.99,
                "inventory": 19,
                "description": "Filigree mandala pendant centered around a lotus motif with rubies.",
                "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
                "category_slug": "pendants",
            },
            {
                "name": "Personalized Name Pendant",
                "sku": "PEND-004",
                "price": 549.99,
                "inventory": 35,
                "description": "Customizable gold bar pendant engraved with elegant serif typography.",
                "image_url": "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=500&h=500&fit=crop",
                "category_slug": "pendants",
            },
            {
                "name": "Chandbali Earrings",
                "sku": "EARR-003",
                "price": 1499.99,
                "inventory": 20,
                "description": "Classic chandbali earrings with crescent silhouette and pearl hangings.",
                "image_url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&h=500&fit=crop",
                "category_slug": "earrings",
            },
            {
                "name": "Hoop Earrings with Charms",
                "sku": "EARR-004",
                "price": 649.99,
                "inventory": 32,
                "description": "Everyday hoops featuring removable gemstone charms for versatility.",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
                "category_slug": "earrings",
            },
            {
                "name": "Artisan Stud Earrings",
                "sku": "EARR-005",
                "price": 429.99,
                "inventory": 40,
                "description": "Hand-hammered gold studs inspired by organic textures from nature.",
                "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
                "category_slug": "earrings",
            },
            {
                "name": "Twinkling Star Ear Cuffs",
                "sku": "EARR-006",
                "price": 899.99,
                "inventory": 27,
                "description": "Ear cuffs with twinkling diamonds forming a celestial constellation.",
                "image_url": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500&h=500&fit=crop",
                "category_slug": "earrings",
            },
            {
                "name": "Temple Mangalsutra",
                "sku": "MANG-002",
                "price": 1349.99,
                "inventory": 18,
                "description": "Temple inspired mangalsutra with goddess motifs and black beads.",
                "image_url": "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&h=500&fit=crop",
                "category_slug": "mangalsutra",
            },
            {
                "name": "Minimal Bar Mangalsutra",
                "sku": "MANG-003",
                "price": 799.99,
                "inventory": 26,
                "description": "Modern mangalsutra with a sleek gold bar centerpiece and dual chains.",
                "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
                "category_slug": "mangalsutra",
            },
            {
                "name": "Lotus Heritage Mangalsutra",
                "sku": "MANG-004",
                "price": 1499.99,
                "inventory": 22,
                "description": "Heritage lotus pendant mangalsutra with polki diamonds and enamel work.",
                "image_url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&h=500&fit=crop",
                "category_slug": "mangalsutra",
            },
            {
                "name": "Heritage Bridal Set",
                "sku": "SET-001",
                "price": 5999.99,
                "inventory": 6,
                "description": "Complete bridal jewelry set with necklace, earrings, maang tikka, and bangles.",
                "image_url": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500&h=500&fit=crop",
                "category_slug": "necklaces",
            },
            {
                "name": "Royal Polki Choker Set",
                "sku": "SET-002",
                "price": 4799.99,
                "inventory": 7,
                "description": "Polki choker and earrings set featuring emerald drops and pearl clusters.",
                "image_url": "https://images.unsplash.com/photo-1602777927000-01848f8ab216?w=500&h=500&fit=crop",
                "category_slug": "necklaces",
            },
            {
                "name": "Pastel Meenakari Set",
                "sku": "SET-003",
                "price": 3699.99,
                "inventory": 9,
                "description": "Pastel meenakari necklace set with intricate enamel work and pearls.",
                "image_url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&h=500&fit=crop",
                "category_slug": "necklaces",
            },
            {
                "name": "Classic Tennis Bracelet",
                "sku": "BRAC-004",
                "price": 2899.99,
                "inventory": 14,
                "description": "Endless row of brilliant diamonds set in white gold tennis bracelet.",
                "image_url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&h=500&fit=crop",
                "category_slug": "bracelets",
            },
            {
                "name": "Gemstone Station Bracelet",
                "sku": "BRAC-005",
                "price": 899.99,
                "inventory": 26,
                "description": "Dainty station bracelet alternating colorful gemstones and gold links.",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
                "category_slug": "bracelets",
            },
            {
                "name": "Sunburst Drop Earrings",
                "sku": "EARR-007",
                "price": 719.99,
                "inventory": 28,
                "description": "Radiant sunburst earrings with citrine centers framed by diamonds.",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
                "category_slug": "earrings",
            },
            {
                "name": "Opal Whisper Necklace",
                "sku": "NECK-007",
                "price": 1699.99,
                "inventory": 17,
                "description": "Iridescent Australian opal pendant suspended from a fine gold chain.",
                "image_url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&h=500&fit=crop",
                "category_slug": "necklaces",
            },
            {
                "name": "Rose Quartz Pendant",
                "sku": "PEND-005",
                "price": 699.99,
                "inventory": 33,
                "description": "Polished rose quartz pendant encased in a modern bezel frame.",
                "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=500&fit=crop",
                "category_slug": "pendants",
            },
            {
                "name": "Art Deco Cuff",
                "sku": "BRAC-006",
                "price": 1499.99,
                "inventory": 15,
                "description": "Art deco cuff bracelet with geometric diamond panels.",
                "image_url": "https://images.unsplash.com/photo-1602777927000-01848f8ab216?w=500&h=500&fit=crop",
                "category_slug": "bracelets",
            },
            {
                "name": "Stackable Midi Rings",
                "sku": "RING-009",
                "price": 499.99,
                "inventory": 40,
                "description": "Set of three midi rings featuring micro pavé diamonds.",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
                "category_slug": "rings",
            },
            {
                "name": "Enchanted Garden Ring",
                "sku": "RING-010",
                "price": 2099.99,
                "inventory": 11,
                "description": "Whimsical ring with floral vines and multi-colored gemstones.",
                "image_url": "https://images.unsplash.com/photo-1518544801958-efcbf8a7ec10?w=500&h=500&fit=crop",
                "category_slug": "rings",
            },
            {
                "name": "Mirage Bangles",
                "sku": "BANG-005",
                "price": 1429.99,
                "inventory": 21,
                "description": "Mirror-finish bangles that reflect light with every movement.",
                "image_url": "https://images.unsplash.com/photo-1602777927000-01848f8ab216?w=500&h=500&fit=crop",
                "category_slug": "bangles",
            },
            {
                "name": "Sparkle Thread Mangalsutra",
                "sku": "MANG-005",
                "price": 929.99,
                "inventory": 24,
                "description": "Delicate mangalsutra with sparkling diamond thread center.",
                "image_url": "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&h=500&fit=crop",
                "category_slug": "mangalsutra",
            },
            {
                "name": "Pearl Lariat Necklace",
                "sku": "NECK-008",
                "price": 1299.99,
                "inventory": 19,
                "description": "Modern lariat necklace finished with twin pearls and gold tassels.",
                "image_url": "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=500&h=500&fit=crop",
                "category_slug": "necklaces",
            },
            {
                "name": "Eternal Leaf Pendant",
                "sku": "PEND-006",
                "price": 829.99,
                "inventory": 27,
                "description": "Leaf silhouette pendant lined with brilliant-cut diamonds.",
                "image_url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&h=500&fit=crop",
                "category_slug": "pendants",
            },
            {
                "name": "Aurora Borealis Earrings",
                "sku": "EARR-008",
                "price": 1149.99,
                "inventory": 18,
                "description": "Gradient gemstone earrings inspired by the northern lights.",
                "image_url": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500&h=500&fit=crop",
                "category_slug": "earrings",
            }
        ]

        tenant1_products = []
        for prod_data in products_data:
            result = await session.execute(
                select(Product).where(Product.sku == prod_data["sku"], Product.tenant_id == tenant1_id)
            )
            existing = result.scalar_one_or_none()
            if existing:
                tenant1_products.append(existing)
            else:
                # Get category_id if category_slug is provided
                category_id = None
                if "category_slug" in prod_data and prod_data["category_slug"]:
                    category = created_categories.get(prod_data["category_slug"])
                    if category:
                        category_id = category.id
                
                product = Product(
                    tenant_id=tenant1_id,
                    name=prod_data["name"],
                    sku=prod_data["sku"],
                    description=prod_data["description"],
                    price_currency="INR",
                    price_amount=Decimal(str(prod_data["price"])),
                    inventory=prod_data["inventory"],
                    image_url=prod_data.get("image_url"),
                    category_id=category_id,
                    created_by=tenant_admin1_id,
                    modified_by=tenant_admin1_id,
                )
                session.add(product)
                tenant1_products.append(product)
        await session.flush()
        print(f"✅ Created/Found {len(tenant1_products)} products for {tenant1.name}")

        # Create customer users for tenant1
        customers_data = [
            {
                "email": "john.doe@example.com",
                "username": "johndoe",
                "full_name": "John Doe",
                "password": "Customer123!@#",
            },
            {
                "email": "jane.smith@example.com",
                "username": "janesmith",
                "full_name": "Jane Smith",
                "password": "Customer123!@#",
            },
            {
                "email": "bob.wilson@example.com",
                "username": "bobwilson",
                "full_name": "Bob Wilson",
                "password": "Customer123!@#",
            },
        ]

        tenant1_customers = []
        for cust_data in customers_data:
            try:
                customer = await auth_service.create_local_user(
                    email=cust_data["email"],
                    username=cust_data["username"],
                    password=cust_data["password"],
                    full_name=cust_data["full_name"],
                    role=UserRole.customer,
                    tenant_id=tenant1_id,
                    actor_id=super_admin_id,
                )
                tenant1_customers.append(customer)
                print(f"✅ Created customer: {customer.email}")
            except ValueError as e:
                print(f"⚠️  Customer may already exist: {e}")
                # Try to fetch existing customer
                result = await session.execute(
                    select(User).where(User.email == cust_data["email"])
                )
                existing = result.scalar_one_or_none()
                if existing:
                    tenant1_customers.append(existing)

        # Create master data for tenant1 BEFORE creating orders
        print("\n📦 Creating payment and shipping methods for tenant1...")
        
        # Payment Methods
        payment_methods_data = [
            {"name": "Credit Card", "type": PaymentMethodType.credit_card, "description": "Visa, Mastercard, Amex", "requires_processing": True, "processing_fee_percentage": Decimal("2.5")},
            {"name": "PayPal", "type": PaymentMethodType.paypal, "description": "PayPal payment gateway", "requires_processing": True, "processing_fee_percentage": Decimal("3.0")},
            {"name": "Bank Transfer", "type": PaymentMethodType.bank_transfer, "description": "Direct bank transfer", "requires_processing": False},
            {"name": "Cash on Delivery", "type": PaymentMethodType.cash_on_delivery, "description": "Pay when you receive", "requires_processing": False},
        ]
        
        created_payment_methods = []
        for pm_data in payment_methods_data:
            # Check if payment method already exists
            result = await session.execute(
                select(PaymentMethod).where(PaymentMethod.name == pm_data["name"], PaymentMethod.tenant_id == tenant1_id)
            )
            existing = result.scalar_one_or_none()
            if existing:
                created_payment_methods.append(existing)
            else:
                payment_method = PaymentMethod(
                    tenant_id=tenant1_id,
                    name=pm_data["name"],
                    type=pm_data["type"],
                    description=pm_data.get("description"),
                    is_active=True,
                    requires_processing=pm_data.get("requires_processing", False),
                    processing_fee_percentage=pm_data.get("processing_fee_percentage"),
                    processing_fee_fixed=pm_data.get("processing_fee_fixed"),
                    created_by=tenant_admin1_id,
                    modified_by=tenant_admin1_id,
                )
                session.add(payment_method)
                await session.flush()
                created_payment_methods.append(payment_method)
        print(f"✅ Created/Found {len(created_payment_methods)} payment methods")
        
        # Shipping Methods
        shipping_methods_data = [
            {"name": "Standard Shipping", "description": "5-7 business days", "base_cost": Decimal("5.99"), "estimated_days": 5, "is_express": False},
            {"name": "Express Shipping", "description": "2-3 business days", "base_cost": Decimal("12.99"), "estimated_days": 2, "is_express": True},
            {"name": "Overnight Shipping", "description": "Next business day", "base_cost": Decimal("24.99"), "estimated_days": 1, "is_express": True, "requires_signature": True},
        ]
        
        created_shipping_methods = []
        for sm_data in shipping_methods_data:
            # Check if shipping method already exists
            result = await session.execute(
                select(ShippingMethod).where(ShippingMethod.name == sm_data["name"], ShippingMethod.tenant_id == tenant1_id)
            )
            existing = result.scalar_one_or_none()
            if existing:
                created_shipping_methods.append(existing)
            else:
                shipping_method = ShippingMethod(
                    tenant_id=tenant1_id,
                    name=sm_data["name"],
                    description=sm_data.get("description"),
                    base_cost_currency="INR",
                    base_cost_amount=sm_data["base_cost"],
                    estimated_days_min=sm_data.get("estimated_days_min"),
                    estimated_days_max=sm_data.get("estimated_days_max"),
                    is_active=True,
                    is_express=sm_data.get("is_express", False),
                    requires_signature=sm_data.get("requires_signature", False),
                    created_by=tenant_admin1_id,
                    modified_by=tenant_admin1_id,
                )
                session.add(shipping_method)
                await session.flush()
                created_shipping_methods.append(shipping_method)
        print(f"✅ Created/Found {len(created_shipping_methods)} shipping methods")

        await session.commit()
        print("💾 Tenant data committed\n")

        await session.commit()
        print("\n🎉 Seed data created successfully!")

        print("\n" + "=" * 60)
        print("DEMO CREDENTIALS")
        print("=" * 60)
        print("\nSuper Admin:")
        print(f"  Email: {SUPER_ADMIN_EMAIL}")
        print("  Password: Admin123!@#")
        print(f"\nTenant ({tenant1.name}):")
        print(f"  Admin: {PRIMARY_TENANT_ADMIN_EMAIL} / Admin123!@#")
        print("  Customers:")
        for i, cust in enumerate(tenant1_customers, 1):
            print(f"    {i}. {cust.email} / Customer123!@#")
        print("\n" + "=" * 60)
        print(f"\nSummary:")
        print(f"  - 1 Tenant created")
        print(f"  - 1 Super Admin")
        print(f"  - 1 Tenant Admin")
        print(f"  - {len(tenant1_customers)} Customers")
        print(f"  - {len(products_data)} Products")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed_data())

