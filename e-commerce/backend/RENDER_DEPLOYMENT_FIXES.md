# Render Deployment Fixes

## Issues Fixed

### 1. Database Driver Issue ✅
**Error**: `sqlalchemy.exc.InvalidRequestError: The asyncio extension requires an async driver to be used. The loaded 'psycopg2' is not async.`

**Solution**: Created `app/db/utils.py` with `ensure_async_database_url()` function that automatically converts:
- `postgresql://` → `postgresql+asyncpg://`
- `postgresql+psycopg2://` → `postgresql+asyncpg://`

**Files Updated**:
- `app/db/session.py`
- `scripts/seed_data.py`
- `scripts/import_excel_products.py`
- `scripts/create_admin.py`

### 2. Stripe Import Issue ✅
**Error**: `ModuleNotFoundError: No module named 'stripe.error'`

**Solution**: Updated `app/services/payment_gateways/stripe_gateway.py` to handle different Stripe library versions:
- Tries `from stripe.error import StripeError` (old way)
- Falls back to `stripe.StripeError` (newer versions)
- Ultimate fallback to `Exception` if neither works

## Render Configuration

### Environment Variables Required

Set these in Render Dashboard → Your Service → Environment:

```
DATABASE_URL=<auto-provided-by-render>
SECRET_KEY=<generate-random-string>
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com
ENVIRONMENT=production
STRIPE_SECRET_KEY=<your-stripe-secret-key> (optional)
RAZORPAY_KEY_ID=<your-razorpay-key> (optional)
RAZORPAY_KEY_SECRET=<your-razorpay-secret> (optional)
REDIS_URL=<your-redis-url> (optional)
```

### Build Command
```
cd e-commerce/backend && pip install -r requirements.txt && alembic upgrade head
```

### Seed Data (Run After First Deployment)

After the first successful deployment, you need to run the seed script to populate the database with initial data.

**Option 1: Via Render Shell (Recommended)**
1. Go to Render Dashboard → Your Service
2. Click "Shell" tab
3. Run:
   ```bash
   cd e-commerce/backend
   python scripts/seed_data.py
   ```

**Option 2: Add to Build Command (One-time)**
Temporarily modify build command to:
```
cd e-commerce/backend && pip install -r requirements.txt && alembic upgrade head && python scripts/seed_data.py
```
Then change it back after first deployment.

**Option 3: Create Admin Only**
If you just need an admin user:
```bash
python scripts/create_admin.py
```

### Start Command
```
cd e-commerce/backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Root Directory
```
e-commerce/backend
```

## Testing Deployment

1. **Check Health Endpoint**:
   ```
   https://your-app.onrender.com/api/v1/health
   ```

2. **Verify Database Connection**:
   - Check logs for successful database connection
   - No errors about async driver

3. **Test API Endpoints**:
   ```
   GET https://your-app.onrender.com/api/v1/products
   ```

## Common Issues

### Port Binding
- Render automatically sets `$PORT` environment variable
- Make sure start command uses `--port $PORT`

### Database Migrations
- Add `alembic upgrade head` to build command
- Or create a separate migration service

### Cold Starts
- Render free tier spins down after inactivity
- First request after spin-down may be slow
- Consider Render paid tier for always-on

## Next Steps

1. ✅ Database driver fixed
2. ✅ Stripe import fixed
3. ✅ Email validator added
4. ✅ Python multipart added
5. ⏳ Deploy and test
6. ⏳ Run seed data (see RENDER_SEED_DATA.md)
7. ⏳ Configure CORS for frontend
8. ⏳ Set up environment variables
9. ⏳ Run database migrations

