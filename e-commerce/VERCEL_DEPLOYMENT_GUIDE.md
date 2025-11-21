# Complete Vercel Deployment Guide

## Overview

Yes, you can deploy this application on Vercel! However, the best approach is:

- **Frontend (Angular)**: Deploy on Vercel ✅
- **Backend (FastAPI)**: Deploy on Railway, Render, or Fly.io ⚠️

## Why This Architecture?

Vercel is optimized for:
- Static sites and frontend frameworks
- Serverless functions (Node.js, Python, Go)
- Edge functions

Your FastAPI backend uses:
- PostgreSQL database (needs persistent connection)
- Redis (for caching/queues)
- Celery (background workers)
- File uploads

These are better suited for traditional hosting platforms.

---

## 🚀 Quick Start: Deploy Frontend to Vercel

### Prerequisites
- Vercel account (free at [vercel.com](https://vercel.com))
- Backend deployed elsewhere (see backend deployment section)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Navigate to Frontend
```bash
cd e-commerce/frontend
```

### Step 3: Login to Vercel
```bash
vercel login
```

### Step 4: Deploy
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No** (first time)
- Project name? **ecommerce-frontend** (or your choice)
- Directory? **./** (current directory)
- Override settings? **No**

### Step 5: Set Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

Add:
- **Key**: `NG_APP_API_BASE_URL`
- **Value**: `https://your-backend-url.com/api/v1`
- **Environment**: Production, Preview, Development

### Step 6: Redeploy
```bash
vercel --prod
```

Or trigger a new deployment from the Vercel dashboard.

---

## 🔧 Backend Deployment Options

### Option 1: Railway (Recommended - Easiest)

1. **Sign up**: [railway.app](https://railway.app)

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL**:
   - Click "+ New" → "Database" → "PostgreSQL"
   - Railway automatically provides `DATABASE_URL`

4. **Add Python Service**:
   - Click "+ New" → "GitHub Repo"
   - Select your repo
   - Root Directory: `e-commerce/backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. **Set Environment Variables**:
   ```
   DATABASE_URL=<auto-provided-by-railway>
   SECRET_KEY=<generate-random-string>
   ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
   ENVIRONMENT=production
   ```

6. **Run Migrations**:
   - Add to start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Or create a separate migration service

7. **Get Backend URL**: Railway provides a URL like `https://your-app.railway.app`

### Option 2: Render

1. **Sign up**: [render.com](https://render.com)

2. **Create Web Service**:
   - New → Web Service
   - Connect GitHub repo
   - Settings:
     - **Name**: `ecommerce-backend`
     - **Root Directory**: `e-commerce/backend`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt && alembic upgrade head`
     - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. **Add PostgreSQL Database**:
   - New → PostgreSQL
   - Link to your web service

4. **Set Environment Variables**:
   ```
   DATABASE_URL=<auto-provided>
   SECRET_KEY=<your-secret>
   ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
   ```

### Option 3: Fly.io

1. **Install Fly CLI**: `curl -L https://fly.io/install.sh | sh`

2. **Login**: `fly auth login`

3. **Initialize**: `cd e-commerce/backend && fly launch`

4. **Deploy**: `fly deploy`

---

## 📝 Configuration Updates Needed

### 1. Update Backend CORS

In `e-commerce/backend/app/main.py`, ensure CORS allows your Vercel domain:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "https://your-custom-domain.com",
        # Add localhost for development
        "http://localhost:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Update Frontend Environment

The `environment.prod.ts` file is already configured to use `NG_APP_API_BASE_URL`.

### 3. Update API Service (if needed)

Check `e-commerce/frontend/src/app/core/services/` - ensure all API calls use `environment.apiBaseUrl`.

---

## 🔐 Security Checklist

- [ ] Set strong `SECRET_KEY` in backend
- [ ] Enable HTTPS (automatic on Vercel/Railway)
- [ ] Configure CORS properly
- [ ] Set up environment variables securely
- [ ] Enable database backups (Railway/Render)
- [ ] Use strong database passwords
- [ ] Enable rate limiting (consider Cloudflare)

---

## 🧪 Testing Deployment

1. **Test Frontend**: Visit your Vercel URL
2. **Test API**: Visit `https://your-backend-url.com/api/v1/health`
3. **Test Authentication**: Try logging in
4. **Test Product Loading**: Check if products load
5. **Test Image Uploads**: Verify file uploads work

---

## 🐛 Troubleshooting

### Frontend can't connect to backend
- Check `NG_APP_API_BASE_URL` is set correctly
- Verify backend CORS allows your Vercel domain
- Check browser console for CORS errors

### Backend database errors
- Verify `DATABASE_URL` is set
- Run migrations: `alembic upgrade head`
- Check database is accessible from backend

### Build fails on Vercel
- Check build logs in Vercel dashboard
- Ensure `package.json` has correct build script
- Verify Node.js version compatibility

---

## 📊 Recommended Architecture

```
┌─────────────────────────────────┐
│         Vercel                 │
│  ┌──────────────────────────┐ │
│  │   Angular Frontend        │ │
│  │   (Static Site)           │ │
│  └───────────┬───────────────┘ │
└──────────────┼─────────────────┘
               │ HTTPS
               │
┌──────────────▼─────────────────┐
│      Railway/Render            │
│  ┌──────────────────────────┐ │
│  │   FastAPI Backend         │ │
│  └───────────┬───────────────┘ │
│              │                  │
│  ┌───────────▼──────────────┐ │
│  │   PostgreSQL Database     │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 💰 Cost Estimate

### Vercel (Frontend)
- **Free Tier**: Perfect for development
  - 100GB bandwidth/month
  - Unlimited deployments
- **Pro**: $20/month (if needed)
  - More bandwidth
  - Team features

### Railway (Backend)
- **Free Tier**: $5 credit/month
  - Good for testing
- **Hobby**: ~$5-10/month
  - Small database
  - Basic usage

### Render (Backend)
- **Free Tier**: Available (with limitations)
  - Spins down after inactivity
- **Starter**: $7/month
  - Always on
  - Better for production

---

## 🚀 Next Steps

1. ✅ Deploy backend to Railway/Render
2. ✅ Get backend URL
3. ✅ Deploy frontend to Vercel
4. ✅ Configure environment variables
5. ✅ Test full stack
6. ✅ Set up custom domain (optional)
7. ✅ Enable monitoring/logging

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Angular Deployment Guide](https://angular.io/guide/deployment)

---

## 🆘 Need Help?

If you encounter issues:
1. Check deployment logs in respective dashboards
2. Verify environment variables are set
3. Test API endpoints directly
4. Check CORS configuration
5. Review database connection strings

