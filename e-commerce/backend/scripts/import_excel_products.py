"""Import products from Excel file with image URLs."""

from __future__ import annotations

import asyncio
import os
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
from app.db.models.product import Product
from app.db.models.tenant import Tenant, TenantStatus
from app.db.models.user import User, UserRole
from app.services.auth import AuthService

PRIMARY_TENANT_SLUG = "premium-jewelry"
PRIMARY_TENANT_ID = UUID("910dccc7-bc18-4d75-8329-bdc766c1097c")
PRIMARY_TENANT_ADMIN_EMAIL = "admin@premiumjewelry.com"

# Image URL mapping based on product category/type
# Using Unsplash images similar to existing seed data
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
    "ring set": "rings",
    "ring sets": "rings",
    "necklace": "necklaces",
    "necklaces": "necklaces",
    "necklace set": "necklaces",
    "necklace sets": "necklaces",
    "earring": "earrings",
    "earrings": "earrings",
    "earring set": "earrings",
    "earring sets": "earrings",
    "bracelet": "bracelets",
    "bracelets": "bracelets",
    "bangle": "bangles",
    "bangles": "bangles",
    "pendant": "pendants",
    "pendants": "pendants",
    "mangalsutra": "mangalsutra",
    "mangalsutras": "mangalsutra",
    "mangalsutra set": "mangalsutra",
    "chain": "necklaces",
    "chains": "necklaces",
    "choker": "necklaces",
    "chokers": "necklaces",
    "anklet": "bracelets",
    "anklets": "bracelets",
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
    
    # Try exact match first
    if category_lower in CATEGORY_MAPPING:
        return CATEGORY_MAPPING[category_lower]
    
    # Try partial matching (e.g., "Gold Ring" -> "rings")
    for key, value in CATEGORY_MAPPING.items():
        if key in category_lower or category_lower in key:
            return value
    
    # If still no match, try to extract category from common patterns
    if "ring" in category_lower:
        return "rings"
    elif "necklace" in category_lower or "chain" in category_lower or "choker" in category_lower:
        return "necklaces"
    elif "earring" in category_lower:
        return "earrings"
    elif "bracelet" in category_lower or "anklet" in category_lower:
        return "bracelets"
    elif "bangle" in category_lower:
        return "bangles"
    elif "pendant" in category_lower:
        return "pendants"
    elif "mangalsutra" in category_lower:
        return "mangalsutra"
    
    return None


def read_excel_products(excel_path: str) -> list[dict]:
    """Read products from Excel file and return as list of dicts."""
    df = pd.read_excel(excel_path)
    
    # Store original column names for exact matching
    original_columns = df.columns.tolist()
    
    # Normalize column names for easier matching (keep original for display)
    df.columns = df.columns.str.strip()
    
    print(f"📊 Found {len(df)} rows in Excel file")
    print(f"📋 Columns: {', '.join(original_columns)}")
    
    products = []
    for idx, row in df.iterrows():
        product_data = {
            "name": None,
            "sku": None,
            "description": None,
            "price": None,
            "inventory": 0,  # Default inventory
            "category": None,
            "image_url": None,
            # Jewelry-specific fields
            "weight": None,  # Net Wt (g)
            "gross_weight": None,  # Gross Wt (g)
            "stone_weight": None,  # Stone Wt (g)
            "material": None,
            "purity": None,
            "stone_type": None,
            "size": None,
            "brand": None,
            "group": None,  # Group (e.g., Gold, Silver, Rose Gold)
            "color": None,
            "certification": None,  # BIS Certified
            "warranty_period": None,
            "origin": None,
            # Additional fields
            "hsn_code": None,
            "rate_per_gram": None,  # Rate/g (₹)
            "gender": None,
            "ready_to_deliver": None,
            # Pricing and calculation fields
            "wastage_percent": None,  # Wastage %
            "metal_value": None,  # Metal Value (₹)
            "wastage_value": None,  # Wastage Value (₹)
            "making_charges": None,  # Making Charges (₹)
            "stone_charges": None,  # Stone Charges (₹)
            "gst_percent": None,  # GST %
        }
        
        # Map exact column names
        for col in df.columns:
            col_stripped = str(col).strip()
            
            # Exact column name matching
            if col_stripped == "Product Name":
                product_data["name"] = str(row[col]).strip() if pd.notna(row[col]) else None
            elif col_stripped == "SKU":
                product_data["sku"] = str(row[col]).strip() if pd.notna(row[col]) else None
            elif col_stripped == "Serial No.":
                # Use as SKU if SKU is missing
                if not product_data["sku"]:
                    try:
                        product_data["sku"] = f"PROD-{int(row[col]):04d}" if pd.notna(row[col]) else None
                    except (ValueError, TypeError):
                        pass
            elif col_stripped == "Category":
                category_val = str(row[col]).strip() if pd.notna(row[col]) else None
                product_data["category"] = category_val
                # Debug category mapping
                if category_val:
                    normalized = normalize_category_name(category_val)
                    if not normalized:
                        print(f"⚠️  Row {idx + 1}: Category '{category_val}' not found in mapping")
            elif col_stripped == "Group":
                product_data["group"] = str(row[col]).strip() if pd.notna(row[col]) else None
            elif col_stripped == "Product Size":
                product_data["size"] = str(row[col]).strip() if pd.notna(row[col]) else None
            elif col_stripped == "Purity":
                product_data["purity"] = str(row[col]).strip() if pd.notna(row[col]) else None
            elif col_stripped == "Net Wt (g)" or col_stripped == "Net":
                try:
                    weight_val = row[col]
                    if pd.notna(weight_val):
                        product_data["weight"] = float(weight_val)
                except (ValueError, TypeError):
                    pass
            elif col_stripped == "Gross Wt (g)":
                try:
                    weight_val = row[col]
                    if pd.notna(weight_val):
                        product_data["gross_weight"] = float(weight_val)
                except (ValueError, TypeError):
                    pass
            elif col_stripped == "Stone Wt (g)":
                try:
                    weight_val = row[col]
                    if pd.notna(weight_val):
                        product_data["stone_weight"] = float(weight_val)
                except (ValueError, TypeError):
                    pass
            elif col_stripped == "Rate/g (₹)":
                try:
                    rate_val = row[col]
                    if pd.notna(rate_val):
                        product_data["rate_per_gram"] = float(rate_val)
                except (ValueError, TypeError):
                    pass
            elif col_stripped == "Final Amt (₹)":
                try:
                    price_val = row[col]
                    if pd.notna(price_val):
                        product_data["price"] = float(price_val)
                except (ValueError, TypeError):
                    pass
            elif col_stripped == "HSN Code":
                product_data["hsn_code"] = str(row[col]).strip() if pd.notna(row[col]) else None
            elif col_stripped == "Wastage %":
                try:
                    wastage_val = row[col]
                    if pd.notna(wastage_val):
                        product_data["wastage_percent"] = float(wastage_val)
                except (ValueError, TypeError):
                    pass
            elif col_stripped == "Metal Value (₹)":
                try:
                    metal_val = row[col]
                    if pd.notna(metal_val):
                        product_data["metal_value"] = float(metal_val)
                except (ValueError, TypeError):
                    pass
            elif col_stripped == "Wastage Value (₹)":
                try:
                    wastage_val = row[col]
                    if pd.notna(wastage_val):
                        product_data["wastage_value"] = float(wastage_val)
                except (ValueError, TypeError):
                    pass
            elif col_stripped == "Making Charges (₹)":
                try:
                    making_val = row[col]
                    if pd.notna(making_val):
                        product_data["making_charges"] = float(making_val)
                except (ValueError, TypeError):
                    pass
            elif col_stripped == "Stone Charges (₹)":
                try:
                    stone_val = row[col]
                    if pd.notna(stone_val):
                        product_data["stone_charges"] = float(stone_val)
                except (ValueError, TypeError):
                    pass
            elif col_stripped == "GST %":
                try:
                    gst_val = row[col]
                    if pd.notna(gst_val):
                        product_data["gst_percent"] = float(gst_val)
                except (ValueError, TypeError):
                    pass
            elif col_stripped == "Pieces":
                try:
                    pieces_val = row[col]
                    if pd.notna(pieces_val):
                        product_data["inventory"] = int(pieces_val)
                except (ValueError, TypeError):
                    pass
            elif col_stripped == "Stock Status":
                # Set inventory based on stock status if Pieces is not available
                stock_status = str(row[col]).strip().lower() if pd.notna(row[col]) else ""
                if product_data["inventory"] == 0:  # Only override if Pieces wasn't set
                    if "in stock" in stock_status or "available" in stock_status:
                        product_data["inventory"] = 1
                    else:
                        product_data["inventory"] = 0
            elif col_stripped == "Ready to Deliver":
                ready_val = str(row[col]).strip().lower() if pd.notna(row[col]) else ""
                product_data["ready_to_deliver"] = ready_val in ["yes", "y", "true", "1", "ready"]
            elif col_stripped == "BIS Certified":
                bis_val = str(row[col]).strip().lower() if pd.notna(row[col]) else ""
                if bis_val in ["yes", "y", "true", "1", "certified"]:
                    product_data["certification"] = "BIS Certified"
            elif col_stripped == "Gender":
                product_data["gender"] = str(row[col]).strip() if pd.notna(row[col]) else None
        
        # Skip if essential fields are missing
        if not product_data["name"]:
            print(f"⚠️  Skipping row {idx + 1}: missing Product Name")
            continue
        
        # Generate SKU if missing (use Serial No. or generate)
        if not product_data["sku"]:
            product_data["sku"] = f"PROD-{idx + 1:04d}"
        
        # Set default price if missing (try Subtotal if Final Amt is not available)
        if product_data["price"] is None or product_data["price"] <= 0:
            # Try to get from Subtotal column
            for col in df.columns:
                if str(col).strip() == "Subtotal (₹)":
                    try:
                        subtotal_val = row[col]
                        if pd.notna(subtotal_val):
                            product_data["price"] = float(subtotal_val)
                            break
                    except (ValueError, TypeError):
                        pass
            # If still no price, set default
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


async def import_products_from_excel(excel_path: str) -> None:
    """Import products from Excel file into database."""
    settings = get_settings()
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        # Get tenant
        result = await session.execute(
            select(Tenant).where(Tenant.id == PRIMARY_TENANT_ID)
        )
        tenant = result.scalar_one_or_none()
        if not tenant:
            print(f"❌ Tenant {PRIMARY_TENANT_ID} not found")
            return
        
        tenant_id = tenant.id
        
        # Get tenant admin
        result = await session.execute(
            select(User).where(
                User.email == PRIMARY_TENANT_ADMIN_EMAIL,
                User.tenant_id == tenant_id,
            )
        )
        tenant_admin = result.scalar_one_or_none()
        if not tenant_admin:
            print(f"❌ Tenant admin {PRIMARY_TENANT_ADMIN_EMAIL} not found")
            return
        
        tenant_admin_id = tenant_admin.id
        
        # Get all categories
        result = await session.execute(
            select(Category).where(Category.tenant_id == tenant_id)
        )
        categories = result.scalars().all()
        category_map = {cat.slug: cat for cat in categories}
        
        print(f"📦 Found {len(category_map)} categories")
        
        # Read products from Excel
        products_data = read_excel_products(excel_path)
        
        # Clear existing products (optional - comment out if you want to keep existing)
        print("\n🧹 Clearing existing products...")
        await session.execute(delete(Product).where(Product.tenant_id == tenant_id))
        await session.flush()
        print("✅ Cleared existing products")
        
        # Import products
        imported_count = 0
        skipped_count = 0
        
        for prod_data in products_data:
            # Check if product with same SKU already exists
            result = await session.execute(
                select(Product).where(
                    Product.sku == prod_data["sku"],
                    Product.tenant_id == tenant_id,
                )
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"⚠️  Product with SKU {prod_data['sku']} already exists, skipping")
                skipped_count += 1
                continue
            
            # Get category_id
            category_id = None
            if prod_data["category_slug"]:
                category = category_map.get(prod_data["category_slug"])
                if category:
                    category_id = category.id
            
            # Create product
            product = Product(
                tenant_id=tenant_id,
                name=prod_data["name"],
                sku=prod_data["sku"],
                description=prod_data.get("description"),
                price_currency="INR",  # Using INR since prices are in ₹
                price_amount=Decimal(str(prod_data["price"])),
                inventory=prod_data.get("inventory", 0),
                image_url=prod_data.get("image_url"),
                category_id=category_id,
                weight=Decimal(str(prod_data["weight"])) if prod_data.get("weight") else None,
                gross_weight=Decimal(str(prod_data["gross_weight"])) if prod_data.get("gross_weight") else None,
                stone_weight=Decimal(str(prod_data["stone_weight"])) if prod_data.get("stone_weight") else None,
                material=prod_data.get("material"),
                purity=prod_data.get("purity"),
                stone_type=prod_data.get("stone_type"),
                size=prod_data.get("size"),
                brand=prod_data.get("brand"),
                color=prod_data.get("color"),
                certification=prod_data.get("certification"),
                warranty_period=prod_data.get("warranty_period"),
                origin=prod_data.get("origin"),
                hsn_code=prod_data.get("hsn_code"),
                rate_per_gram=Decimal(str(prod_data["rate_per_gram"])) if prod_data.get("rate_per_gram") else None,
                gender=prod_data.get("gender"),
                ready_to_deliver=prod_data.get("ready_to_deliver", False),
                group=prod_data.get("group"),
                wastage_percent=Decimal(str(prod_data["wastage_percent"])) if prod_data.get("wastage_percent") else None,
                metal_value=Decimal(str(prod_data["metal_value"])) if prod_data.get("metal_value") else None,
                wastage_value=Decimal(str(prod_data["wastage_value"])) if prod_data.get("wastage_value") else None,
                making_charges=Decimal(str(prod_data["making_charges"])) if prod_data.get("making_charges") else None,
                stone_charges=Decimal(str(prod_data["stone_charges"])) if prod_data.get("stone_charges") else None,
                gst_percent=Decimal(str(prod_data["gst_percent"])) if prod_data.get("gst_percent") else None,
                created_by=tenant_admin_id,
                modified_by=tenant_admin_id,
            )
            session.add(product)
            imported_count += 1
        
        await session.commit()
        
        print("\n" + "=" * 60)
        print("IMPORT SUMMARY")
        print("=" * 60)
        print(f"✅ Imported: {imported_count} products")
        print(f"⚠️  Skipped: {skipped_count} products")
        print("=" * 60)


if __name__ == "__main__":
    # Get Excel file path - try multiple locations
    script_dir = Path(__file__).parent
    possible_paths = [
        # From workspace mount (Docker)
        Path("/workspace") / "jewellery_product_master_50_rows_v2.xlsx",
        # From backend directory (local)
        script_dir.parent.parent / "jewellery_product_master_50_rows_v2.xlsx",
        # In backend directory itself
        script_dir.parent / "jewellery_product_master_50_rows_v2.xlsx",
        # Current directory
        Path("jewellery_product_master_50_rows_v2.xlsx"),
        # Relative to script
        script_dir / "jewellery_product_master_50_rows_v2.xlsx",
    ]
    
    excel_file = None
    for path in possible_paths:
        try:
            resolved_path = path.resolve()
            if resolved_path.exists():
                excel_file = resolved_path
                break
        except (OSError, RuntimeError):
            # Path resolution failed, try as-is
            if path.exists():
                excel_file = path
                break
    
    if not excel_file or not excel_file.exists():
        print("❌ Excel file not found. Tried the following locations:")
        for path in possible_paths:
            print(f"   - {path}")
        print("\nPlease ensure the file 'jewellery_product_master_50_rows_v2.xlsx' exists at:")
        print("   - e-commerce root directory (same level as backend/)")
        print("   - OR in the backend directory")
        print("   - OR copy it to the current working directory")
    else:
        print(f"📄 Reading Excel file: {excel_file}")
        asyncio.run(import_products_from_excel(str(excel_file)))

