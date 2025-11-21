# Build and Deployment Instructions

## Quick Start

### Windows (PowerShell)

```powershell
# Navigate to project directory
cd d:\Manoj-Eccomerce\e-commerce

# Run deployment script
.\deploy.ps1

# Or manually:
docker compose up -d --build
```

### Linux/Mac

```bash
# Navigate to project directory
cd e-commerce

# Make script executable and run
chmod +x deploy.sh
./deploy.sh

# Or manually:
docker-compose up -d --build
```

## Manual Build Steps

### 1. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and update:
# - SECRET_KEY (generate with: openssl rand -hex 32)
# - Database passwords
# - Payment gateway keys (if using)
```

### 2. Build Docker Images

```bash
# Build all services
docker compose build

# Or build specific service
docker compose build backend
docker compose build frontend
```

### 3. Start Services

```bash
# Start all services in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Check service status
docker compose ps
```

### 4. Run Database Migrations

```bash
# Wait for services to be healthy (about 10-15 seconds)
# Then run migrations
docker compose exec backend alembic upgrade head
```

### 5. Verify Deployment

- Frontend: http://localhost:4200
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Production Build

```bash
# Use production compose file
docker compose -f docker-compose.prod.yml up -d --build

# Or use deployment script
.\deploy.ps1 -Environment production  # Windows
./deploy.sh production                # Linux/Mac
```

## Troubleshooting

### Build Fails

1. **Check Docker is running**: `docker ps`
2. **Clear Docker cache**: `docker system prune -a`
3. **Check disk space**: `docker system df`
4. **View build logs**: `docker compose build --progress=plain`

### Services Won't Start

1. **Check logs**: `docker compose logs [service-name]`
2. **Verify ports**: Ensure ports 4200, 8000, 5432, 6379, 5672, 15672 are available
3. **Check environment**: Verify `.env` file exists and has correct values
4. **Restart services**: `docker compose restart`

### Database Connection Issues

1. **Wait for PostgreSQL**: Services have health checks, wait 10-15 seconds
2. **Check database URL**: Verify `DATABASE_URL` in `.env`
3. **Test connection**: `docker compose exec backend python -c "from app.db.session import get_settings; print(get_settings().database_url)"`

### Frontend Build Issues

1. **Clear node_modules**: `docker compose exec frontend rm -rf node_modules`
2. **Rebuild**: `docker compose build frontend --no-cache`
3. **Check npm version**: Ensure Node 20+ is used

## Service URLs

After successful deployment:

| Service | URL | Credentials |
|---------|-----|------------|
| Frontend | http://localhost:4200 | - |
| Backend API | http://localhost:8000 | - |
| API Docs | http://localhost:8000/docs | - |
| RabbitMQ Management | http://localhost:15672 | admin/admin |
| PostgreSQL | localhost:5432 | postgres/vinod |
| Redis | localhost:6379 | - |

## Next Steps

1. **Seed Database** (optional):
   ```bash
   docker compose exec backend python -m app.scripts.seed_data
   ```

2. **Access Admin Panel**:
   - Navigate to http://localhost:4200
   - Login with seeded admin credentials

3. **Test API**:
   - Visit http://localhost:8000/docs
   - Try the health endpoint: GET /health

## Stopping Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes data)
docker compose down -v
```

## Rebuilding After Code Changes

```bash
# Rebuild and restart
docker compose up -d --build

# Or rebuild specific service
docker compose build backend
docker compose up -d backend
```

