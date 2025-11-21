# E-Commerce Platform - Docker Deployment Guide

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- At least 4GB RAM available
- Ports available: 4200, 8000, 5432, 6379, 5672, 15672

## Quick Start

### 1. Clone and Navigate

```bash
cd e-commerce
```

### 2. Configure Environment

Copy the example environment file:

```bash
# Linux/Mac
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Edit `.env` and update:
- `SECRET_KEY` - Generate a strong secret key (min 32 characters)
- `POSTGRES_PASSWORD` - Database password
- Payment gateway keys (Stripe/Razorpay) if using payment features

### 3. Deploy

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Windows PowerShell:**
```powershell
.\deploy.ps1
```

**Manual Deployment:**
```bash
# Build and start all services
docker-compose up -d --build

# Run database migrations
docker-compose exec backend alembic upgrade head

# View logs
docker-compose logs -f
```

## Services

After deployment, the following services will be available:

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **RabbitMQ Management**: http://localhost:15672 (admin/admin)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Production Deployment

For production deployment:

```bash
# Linux/Mac
./deploy.sh production

# Windows PowerShell
.\deploy.ps1 -Environment production
```

Or manually:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Production Considerations

1. **Environment Variables**: Update `.env` with production values
2. **Secrets**: Use a secrets management service (not hardcoded)
3. **SSL/TLS**: Configure reverse proxy (nginx/traefik) with SSL certificates
4. **Database Backups**: Set up automated backups
5. **Monitoring**: Configure logging and monitoring (Prometheus, Grafana)
6. **Scaling**: Use Docker Swarm or Kubernetes for multi-instance deployment

## Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f celery-worker
```

### Stop Services
```bash
docker-compose down
```

### Restart a Service
```bash
docker-compose restart backend
```

### Execute Commands in Container
```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Access database
docker-compose exec postgres psql -U postgres -d ecommerce_db

# Access backend shell
docker-compose exec backend bash
```

### Rebuild After Code Changes
```bash
# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Rebuild all
docker-compose build
docker-compose up -d
```

## Database Management

### Run Migrations
```bash
docker-compose exec backend alembic upgrade head
```

### Create New Migration
```bash
docker-compose exec backend alembic revision --autogenerate -m "description"
```

### Rollback Migration
```bash
docker-compose exec backend alembic downgrade -1
```

### Seed Database (Optional)
```bash
docker-compose exec backend python -m app.scripts.seed_data
```

## Troubleshooting

### Services Not Starting

1. Check logs: `docker-compose logs`
2. Verify ports are not in use
3. Check Docker resources (memory/CPU)
4. Verify environment variables in `.env`

### Database Connection Issues

1. Ensure PostgreSQL is healthy: `docker-compose ps postgres`
2. Check DATABASE_URL in `.env`
3. Verify network connectivity: `docker-compose exec backend ping postgres`

### Frontend Not Loading

1. Check backend is running: `curl http://localhost:8000/health`
2. Verify API_BASE_URL in frontend environment
3. Check browser console for CORS errors
4. Verify ALLOWED_ORIGINS in backend `.env`

### Payment Gateway Issues

1. Verify API keys are set in `.env`
2. Check payment gateway service status
3. Review payment transaction logs

## Health Checks

All services include health checks. Check status:

```bash
docker-compose ps
```

All services should show "healthy" status.

## Cleanup

### Remove All Containers and Volumes
```bash
docker-compose down -v
```

### Remove Images
```bash
docker-compose down --rmi all
```

## Network Architecture

```
┌─────────────┐
│  Frontend   │ (Port 4200)
│   (Nginx)   │
└──────┬──────┘
       │
       │ HTTP
       │
┌──────▼──────┐
│   Backend   │ (Port 8000)
│   (FastAPI) │
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
│ PostgreSQL  │ │   Redis   │ │ RabbitMQ  │ │  Celery   │
│  (Port 5432)│ │ (Port 6379)│ │(Port 5672)│ │  Worker   │
└─────────────┘ └────────────┘ └───────────┘ └───────────┘
```

## Security Notes

- Change default passwords in production
- Use strong SECRET_KEY (generate with: `openssl rand -hex 32`)
- Enable SSL/TLS in production
- Restrict database access
- Use secrets management for sensitive data
- Regularly update Docker images

## Support

For issues or questions, check:
- Application logs: `docker-compose logs`
- Service health: `docker-compose ps`
- API documentation: http://localhost:8000/docs

