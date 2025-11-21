# Setup Guide

## Environment Variables

### Backend (.env file in `backend/` directory)

Create `backend/.env` with the following:

```env
# Database Configuration
DATABASE_URL=postgresql+asyncpg://postgres:vinod@localhost:5432/ecommerce_db

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Application Settings
ENVIRONMENT=development
APP_NAME=Premium Commerce API
SECRET_KEY=dev-secret-key-change-in-production-min-32-chars-long

# JWT Settings
ACCESS_TOKEN_EXPIRE_MINUTES=60

# CORS Settings
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:5173

# Super Admin Credentials (for seeding)
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=adminpass

# Tenant Admin Credentials (for seeding)
TENANT_ADMIN_EMAIL=tenantadmin@example.com
TENANT_ADMIN_PASSWORD=tenantpass

# Customer Credentials (for seeding)
CUSTOMER_EMAIL=customer@example.com
CUSTOMER_PASSWORD=customerpass
```

### Frontend (.env file in `frontend/` directory)

Create `frontend/.env` with the following:

```env
# API Configuration
API_BASE_URL=http://localhost:8000

# Environment
NODE_ENV=development
```

## Quick Start

1. **Copy environment files:**
   ```bash
   # Backend
   cd backend
   # Create .env file with content above
   
   # Frontend
   cd frontend
   # Create .env file with content above
   ```

2. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Run migrations:**
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

4. **Seed data:**
   ```bash
   docker-compose exec backend python scripts/seed_data.py
   ```

5. **Access:**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
