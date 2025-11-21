# Running Seed Data on Render

After deploying your backend to Render, you need to populate the database with initial data (admin users, tenants, products, etc.).

## Quick Start

### Method 1: Using Render Shell (Easiest)

1. **Open Render Dashboard** → Your Backend Service
2. **Click "Shell" tab** (in the left sidebar)
3. **Run the seed script**:
   ```bash
   cd e-commerce/backend
   python scripts/seed_data.py
   ```

This will create:
- ✅ Super Admin user
- ✅ Demo tenant (Premium Jewelry)
- ✅ Tenant admin user
- ✅ Sample customers
- ✅ Products and categories
- ✅ Payment and shipping methods

### Method 2: One-Time Build Command

**For first deployment only**, modify your build command in Render:

1. Go to **Settings** → **Build & Deploy**
2. Change **Build Command** to:
   ```
   cd e-commerce/backend && pip install -r requirements.txt && alembic upgrade head && python scripts/seed_data.py
   ```
3. **Save** and let it redeploy
4. **After successful deployment**, change it back to:
   ```
   cd e-commerce/backend && pip install -r requirements.txt && alembic upgrade head
   ```

### Method 3: Create Admin Only

If you just need an admin user (without all the demo data):

```bash
# In Render Shell
cd e-commerce/backend
python scripts/create_admin.py
```

## Demo Credentials

After running the seed script, you can login with:

### Super Admin
- **Email**: `admin@manoj-commerce.com`
- **Password**: `Admin123!@#`

### Tenant Admin (Premium Jewelry)
- **Email**: `admin@premiumjewelry.com`
- **Password**: `Admin123!@#`

### Sample Customers
- **Email**: `john.doe@example.com`
- **Password**: `Customer123!@#`

## Verify Seed Data

After running the seed script, verify it worked:

1. **Check Health Endpoint**:
   ```
   GET https://your-app.onrender.com/api/v1/health
   ```

2. **Try Login**:
   ```
   POST https://your-app.onrender.com/api/v1/auth/login
   {
     "email": "admin@manoj-commerce.com",
     "password": "Admin123!@#"
   }
   ```

3. **Check Products**:
   ```
   GET https://your-app.onrender.com/api/v1/products
   ```

## Troubleshooting

### Error: "Module not found"
Make sure you're in the correct directory:
```bash
cd e-commerce/backend
python scripts/seed_data.py
```

### Error: "Database connection failed"
- Verify `DATABASE_URL` is set in Render environment variables
- Check that the database service is running
- Ensure migrations ran successfully (`alembic upgrade head`)

### Error: "User already exists"
This is normal if you run the script multiple times. The script is idempotent and will skip existing users.

### Script Runs But No Data
- Check Render logs for errors
- Verify database URL is correct
- Make sure migrations completed successfully

## Re-running Seed Data

The seed script is **idempotent** - you can run it multiple times safely. It will:
- ✅ Skip existing users (won't create duplicates)
- ✅ Create new products each time
- ✅ Show warnings for existing data

## Next Steps

After seeding:
1. ✅ Test login with admin credentials
2. ✅ Verify products are visible
3. ✅ Test API endpoints
4. ✅ Connect frontend to backend
5. ✅ Configure CORS if needed

