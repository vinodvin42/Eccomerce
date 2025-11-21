FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry

# Configure poetry to not create virtual env (install to system Python)
RUN poetry config virtualenvs.create false

# Copy dependency files
COPY pyproject.toml poetry.lock* ./
COPY requirements.txt ./

# Install dependencies - try poetry, regenerate lock if out of sync, fallback to pip
RUN (poetry install --no-interaction --no-ansi --no-root 2>&1 || \
     (echo "Checking lock file..." && \
      poetry lock 2>&1 && \
      poetry install --no-interaction --no-ansi --no-root 2>&1)) || \
    (echo "Poetry install failed, using pip..." && \
     pip install --no-cache-dir -r requirements.txt)

# Verify uvicorn is installed
RUN python -c "import uvicorn" || pip install --no-cache-dir uvicorn[standard]

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check (as appuser)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command - use python -m to ensure we find uvicorn in system Python
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
