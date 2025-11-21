# Excel Product Import Commands

## Local Development

### Windows (PowerShell)
```powershell
cd e-commerce/backend
.\run_excel_import.ps1
```

### Direct Python Command
```bash
cd e-commerce/backend
python scripts/import_excel_products.py
```

### Using Poetry
```bash
cd e-commerce/backend
poetry run python scripts/import_excel_products.py
```

### Using Docker
```bash
cd e-commerce
docker-compose exec backend python scripts/import_excel_products.py
```

## Render Deployment

### Method 1: Using Render Shell (Recommended)

1. **Open Render Dashboard** → Your Backend Service
2. **Click "Shell" tab**
3. **Run**:
   ```bash
   cd e-commerce/backend
   python scripts/import_excel_products.py
   ```

### Method 2: Upload Excel File First

If you need to upload the Excel file to Render:

1. **Upload Excel file** to Render:
   - Use Render Shell to upload: `scp` or use Render's file upload feature
   - Or commit the Excel file to your repository
   - Place it at: `e-commerce/jewellery_product_master_50_rows_v2.xlsx`

2. **Then run the import**:
   ```bash
   cd e-commerce/backend
   python scripts/import_excel_products.py
   ```

## Excel File Location

The script looks for the Excel file in these locations (in order):
1. `e-commerce/jewellery_product_master_50_rows_v2.xlsx` (project root)
2. `e-commerce/backend/jewellery_product_master_50_rows_v2.xlsx`
3. Current working directory

## Excel File Format

The script automatically maps common column names:

| Excel Column | Maps To |
|-------------|---------|
| Name, Product, Title | Product name |
| SKU, Code, ID | Product SKU |
| Description, Desc, Details | Product description |
| Price, Cost, Amount | Product price |
| Inventory, Stock, Quantity | Stock quantity |
| Category, Type | Product category |
| Image, Photo, Picture | Image URL (optional) |

## What Gets Imported

- ✅ Products from Excel file
- ✅ Categories (auto-created if missing)
- ✅ Assigned to "Premium Jewelry" tenant
- ✅ Auto-assigned images if not provided

## Update Existing Products

The script will:
- **Update** products with matching SKU
- **Create** new products if SKU doesn't exist
- **Skip** products with duplicate SKUs (keeps first one)

## Troubleshooting

### Error: "Excel file not found"
- Make sure the Excel file is in the correct location
- Check the file name matches: `jewellery_product_master_50_rows_v2.xlsx`
- Verify file path in error message

### Error: "pandas not found"
Install dependencies:
```bash
pip install pandas openpyxl
# or
poetry add pandas openpyxl
```

### Error: "Database connection failed"
- Verify `DATABASE_URL` is set correctly
- Check database is running and accessible
- Ensure migrations are up to date

### Error: "Module not found"
Make sure you're in the correct directory:
```bash
cd e-commerce/backend
```

## Quick Reference

**Local (Windows):**
```powershell
cd e-commerce/backend
.\run_excel_import.ps1
```

**Local (Linux/Mac):**
```bash
cd e-commerce/backend
python scripts/import_excel_products.py
```

**Render:**
```bash
# In Render Shell
cd e-commerce/backend
python scripts/import_excel_products.py
```

