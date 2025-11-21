# Premium E-Commerce Platform

A production-ready, multi-tenant e-commerce platform built with Angular 17, FastAPI, PostgreSQL, and Redis.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)
- PostgreSQL 15+ (if running without Docker)
- Redis 7+ (if running without Docker)

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Manoj-Eccomerce/e-commerce
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

5. **Seed initial data**
   ```bash
   docker-compose exec backend python scripts/seed_data.py
   ```

6. **Access the application**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

##How to access the UI
Open http://localhost:4200/ in your browser
You should be redirected to /login if not authenticated
Login credentials (from seed script):
Super Admin: admin@manoj-commerce.com / Admin123!@#
Tenant Admin (Acme): admin@acme.com / Admin123!@#
Tenant Admin (TechStart): admin@techstart.com / Admin123!@#

### Local Development (Without Docker)

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   poetry install
   # or
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Run migrations**
   ```bash
   alembic upgrade head
   ```

5. **Seed data**
   ```bash
   python scripts/seed_data.py
   ```

6. **Start the server**
   ```bash
   uvicorn app.main:app --reload
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
e-commerce/
├── backend/              # FastAPI backend application
│   ├── app/
│   │   ├── api/         # API routes
│   │   ├── core/        # Core configuration and utilities
│   │   ├── db/          # Database models and session
│   │   ├── schemas/     # Pydantic schemas
│   │   └── services/    # Business logic layer
│   ├── alembic/         # Database migrations
│   └── scripts/         # Utility scripts
├── frontend/            # Angular frontend application
│   └── src/
│       ├── app/
│       │   ├── core/    # Core services, guards, interceptors
│       │   ├── features/# Feature modules
│       │   ├── layouts/  # Layout components
│       │   ├── shared/  # Shared components and models
│       │   └── state/   # NgRx state management
│       └── environments/# Environment configurations
└── docs/                # Documentation
```

## 🔐 Default Credentials

After seeding, you can use these credentials:

- **Super Admin**: `admin@example.com` / `adminpass`
- **Tenant Admin**: `tenantadmin@example.com` / `tenantpass`
- **Customer**: `customer@example.com` / `customerpass`

## 🛠️ Development

### Running Tests

**Backend:**
```bash
cd backend
pytest
```

**Frontend:**
```bash
cd frontend
npm test
```

### Code Quality

**Backend:**
```bash
cd backend
ruff check .
mypy app/
```

**Frontend:**
```bash
cd frontend
npm run lint
```

## 📚 Documentation

- [Architecture Overview](docs/architecture-overview.md)
- [Process Flow](docs/process-flow.md)
- [Delivery Roadmap](docs/delivery-roadmap.md)
- [API Documentation](http://localhost:8000/docs) (when server is running)

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild services
docker-compose up -d --build

# Run migrations
docker-compose exec backend alembic upgrade head

# Access backend shell
docker-compose exec backend bash

# Access frontend shell
docker-compose exec frontend sh
```

## 🔧 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running and accessible
- Check `DATABASE_URL` in `.env` file
- Verify database credentials

### Port Conflicts
- Backend default: 8000
- Frontend default: 4200
- PostgreSQL default: 5432
- Redis default: 6379

Change ports in `docker-compose.yml` if needed.

## 📝 License

[Your License Here]

## 🤝 Contributing

[Contributing Guidelines Here]

