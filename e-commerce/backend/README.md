# E-Commerce Backend

FastAPI-based backend implementing catalog, order, and tenant management features for the multi-tenant commerce platform.

## Local Setup

1. Install Poetry 1.8+ and Python 3.12.
2. Copy `.env.example` to `.env` and adjust secrets.
3. Install deps: `poetry install`
4. Start services (PostgreSQL, Redis, RabbitMQ) via `docker compose -f infra/docker-compose.yml up -d`
5. Run migrations: `poetry run alembic upgrade head`
6. Launch API: `poetry run uvicorn app.main:app --reload`

## Testing

```
poetry run pytest
poetry run ruff check .
poetry run mypy .
```

