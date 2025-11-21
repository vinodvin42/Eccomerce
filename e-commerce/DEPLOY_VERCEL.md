# Deploying to Vercel

This guide explains how to deploy your e-commerce application to Vercel.

## Deployment Strategy

### Frontend (Angular) - ✅ Can deploy on Vercel
The Angular frontend can be deployed directly on Vercel as a static site.

### Backend (FastAPI) - ⚠️ Requires alternative approach
The FastAPI backend with PostgreSQL, Redis, and Celery is better suited for:
- **Railway** (recommended) - Easy PostgreSQL + Python deployment
- **Render** - Good for full-stack apps
- **Fly.io** - Great for Docker containers
- **DigitalOcean App Platform** - Full control
- **AWS/GCP/Azure** - Enterprise solutions

## Option 1: Frontend on Vercel + Backend on Railway/Render (Recommended)

### Step 1: Deploy Frontend to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to frontend directory**:
   ```bash
   cd e-commerce/frontend
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy**:
   ```bash
   vercel
   ```
   Follow the prompts to configure your project.

5. **Set Environment Variables** in Vercel Dashboard:
   - Go to your project settings → Environment Variables
   - Add: `API_BASE_URL` = `https://your-backend-url.com/api/v1`

6. **Update environment.prod.ts** to use the backend URL:
   ```typescript
   export const environment = {
     production: true,
     apiBaseUrl: process.env['API_BASE_URL'] || 'https://your-backend-url.com/api/v1'
   };
   ```

### Step 2: Deploy Backend to Railway (Recommended)

Railway is excellent for Python/FastAPI apps with PostgreSQL:

1. **Sign up at** [railway.app](https://railway.app)

2. **Create a new project** and add:
   - PostgreSQL service
   - Python service (from GitHub repo)

3. **Configure environment variables**:
   ```
   DATABASE_URL=<railway-postgres-url>
   REDIS_URL=<railway-redis-url> (optional)
   SECRET_KEY=<your-secret-key>
   ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
   ```

4. **Run migrations**:
   Railway can run migrations automatically or you can add a startup script.

5. **Your backend will be available at**: `https://your-app.railway.app`

### Alternative: Deploy Backend to Render

1. **Sign up at** [render.com](https://render.com)

2. **Create a new Web Service**:
   - Connect your GitHub repo
   - Build Command: `cd backend && poetry install && poetry run alembic upgrade head`
   - Start Command: `cd backend && poetry run uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. **Add PostgreSQL database** in Render dashboard

4. **Set environment variables** similar to Railway

## Option 2: Full Stack on Vercel (Advanced)

Vercel supports Python serverless functions, but requires refactoring:

### Limitations:
- FastAPI needs to be adapted for serverless
- Database connections need connection pooling
- Celery/Redis won't work (need alternatives)
- File uploads need cloud storage (S3, Cloudinary)

### If you want to try:

1. **Create `api/` directory** in frontend for serverless functions
2. **Refactor backend** to use Vercel serverless functions
3. **Use external services** for:
   - Database: Vercel Postgres or external provider
   - File storage: Vercel Blob or S3
   - Background jobs: Vercel Cron or external service

## Quick Start: Frontend Only on Vercel

1. **Ensure your backend is deployed elsewhere** (Railway, Render, etc.)

2. **Update environment variables**:
   ```bash
   cd e-commerce/frontend
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

4. **Configure environment variables** in Vercel dashboard:
   - `API_BASE_URL`: Your backend API URL

## Recommended Architecture

```
┌─────────────────┐
│  Vercel         │
│  (Frontend)     │
│  Angular App    │
└────────┬─────────┘
         │
         │ HTTPS
         │
┌────────▼─────────┐
│  Railway/Render  │
│  (Backend)       │
│  FastAPI         │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼───┐
│  PG   │ │ Redis │
└───────┘ └───────┘
```

## Environment Variables Needed

### Frontend (Vercel):
- `API_BASE_URL`: Backend API URL

### Backend (Railway/Render):
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key
- `ALLOWED_ORIGINS`: Comma-separated list of frontend URLs
- `REDIS_URL`: Redis connection (optional)
- `ENVIRONMENT`: `production`

## Next Steps

1. Deploy backend first (Railway or Render)
2. Get backend URL
3. Deploy frontend to Vercel with backend URL
4. Update CORS settings in backend
5. Test the full stack

