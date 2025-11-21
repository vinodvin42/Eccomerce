#!/bin/bash

# E-Commerce Platform Deployment Script
set -e

echo "🚀 Starting E-Commerce Platform Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please update .env file with your configuration before continuing.${NC}"
    read -p "Press Enter to continue after updating .env file..."
fi

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Determine compose command
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# Check environment
ENV=${1:-development}
echo -e "${GREEN}📦 Building for environment: ${ENV}${NC}"

if [ "$ENV" = "production" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo -e "${YELLOW}⚠️  Using production configuration${NC}"
else
    COMPOSE_FILE="docker-compose.yml"
    echo -e "${GREEN}✓ Using development configuration${NC}"
fi

# Stop existing containers
echo -e "${GREEN}🛑 Stopping existing containers...${NC}"
$COMPOSE_CMD -f $COMPOSE_FILE down

# Build images
echo -e "${GREEN}🔨 Building Docker images...${NC}"
$COMPOSE_CMD -f $COMPOSE_FILE build --no-cache

# Start services
echo -e "${GREEN}🚀 Starting services...${NC}"
$COMPOSE_CMD -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo -e "${GREEN}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Run database migrations
echo -e "${GREEN}📊 Running database migrations...${NC}"
$COMPOSE_CMD -f $COMPOSE_FILE exec -T backend alembic upgrade head || echo -e "${YELLOW}⚠️  Migration failed or already up to date${NC}"

# Seed database (optional, uncomment if needed)
# echo -e "${GREEN}🌱 Seeding database...${NC}"
# $COMPOSE_CMD -f $COMPOSE_FILE exec -T backend python -m app.scripts.seed_data || echo -e "${YELLOW}⚠️  Seeding failed or already done${NC}"

# Show status
echo -e "${GREEN}📊 Service Status:${NC}"
$COMPOSE_CMD -f $COMPOSE_FILE ps

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Frontend: http://localhost:4200${NC}"
echo -e "${GREEN}🔧 Backend API: http://localhost:8000${NC}"
echo -e "${GREEN}📚 API Docs: http://localhost:8000/docs${NC}"
echo -e "${GREEN}🐰 RabbitMQ Management: http://localhost:15672 (admin/admin)${NC}"

