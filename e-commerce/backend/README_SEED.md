# Running the Seed Script

This guide explains how to run the seed data script to populate your database with demo data.

## Prerequisites

1. Database must be running and accessible
2. Migrations must be run first: `alembic upgrade head`
3. `.env` file must be configured with database credentials

## Methods to Run Seed Script

### Method 1: Using PowerShell Script (Recommended for Windows)

```powershell
cd backend
.\run_seed.ps1
```

This script will automatically:
- Check for Docker Compose
- Check for Poetry
- Fall back to direct Python execution

### Method 2: Using Docker Compose

If you're using Docker Compose:

```powershell
# From e-commerce directory
docker-compose up -d
docker-compose exec backend python scripts/seed_data.py
```

### Method 3: Using Poetry

If Poetry is installed:

```powershell
cd backend
poetry run python scripts/seed_data.py
```

### Method 4: Using Python Directly

If Python and dependencies are installed:

```powershell
cd backend
python scripts/seed_data.py
# or
py scripts/seed_data.py
```

**Note:** Make sure dependencies are installed first:
```powershell
pip install -r requirements.txt
# or
poetry install
```

## Excel Product Import

The seed script now supports importing products from an Excel file. If the file `jewellery_product_master_50_rows_v2.xlsx` exists in the project root, it will automatically use that data instead of hardcoded products.

### Excel File Format

The Excel file should contain columns with product information. The script will automatically map common column names:
- **Name/Product/Title**: Product name
- **SKU/Code/ID**: Product SKU
- **Description/Desc/Details**: Product description
- **Price/Cost/Amount**: Product price
- **Inventory/Stock/Quantity**: Stock quantity
- **Category/Type**: Product category
- **Image/Photo/Picture**: Image URL (optional - will be auto-assigned if missing)

### Auto Image Assignment

If products don't have image URLs, the script will automatically assign appropriate Unsplash images based on the product category:
- Rings, Necklaces, Earrings, Bracelets, Bangles, Pendants, Mangalsutra
- Each category has multiple curated images that rotate based on product index

### Running Excel Import Separately

You can also run the Excel import script separately:

```powershell
cd backend
.\run_excel_import.ps1
```

Or directly:
```powershell
python -m scripts.import_excel_products
```

## What Gets Created

The seed script creates:

- **1 Super Admin** user
- **1 Demo Tenant** (Premium Jewelry)
- **1 Tenant Admin** user
- **3 Customer** users
- **Products** (from Excel file if available, otherwise from hardcoded data)
- **Master Data** (Categories, Payment Methods, Shipping Methods)

## Demo Credentials

After running the seed script, you can use these credentials:

### Super Admin
- Email: `admin@manoj-commerce.com`
- Password: `Admin123!@#`

### Tenant 1 (Acme Corporation)
- Admin: `admin@acme.com` / `Admin123!@#`
- Customers:
  - `john.doe@example.com` / `Customer123!@#`
  - `jane.smith@example.com` / `Customer123!@#`
  - `bob.wilson@example.com` / `Customer123!@#`

### Tenant 2 (TechStart Inc)
- Admin: `admin@techstart.com` / `Admin123!@#`

## Troubleshooting

### Error: "Poetry not found"
- Install Poetry: https://python-poetry.org/docs/#installation
- Or use Docker Compose method
- Or use Python directly

### Error: "Python not found"
- Install Python 3.12+ from https://www.python.org/downloads/
- Make sure Python is added to PATH

### Error: "Database connection failed"
- Check `.env` file has correct `DATABASE_URL`
- Ensure PostgreSQL is running
- Verify database credentials

### Error: "Module not found"
- Install dependencies: `pip install -r requirements.txt`
- Or use Poetry: `poetry install`

## Running Multiple Times

The seed script is idempotent - it can be run multiple times safely. It will:
- Skip creating users that already exist
- Create new products and orders each time
- Show warnings for existing users

