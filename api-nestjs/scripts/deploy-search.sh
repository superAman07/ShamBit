#!/bin/bash

# Search System Deployment Script
# This script deploys the complete search infrastructure

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
SKIP_INFRASTRUCTURE=${2:-false}
DRY_RUN=${3:-false}

echo -e "${BLUE}🚀 Starting Search System Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Skip Infrastructure: ${SKIP_INFRASTRUCTURE}${NC}"
echo -e "${BLUE}Dry Run: ${DRY_RUN}${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}📋 Checking Prerequisites${NC}"

if ! command_exists docker; then
    print_error "Docker is not installed"
    exit 1
fi
print_status "Docker is installed"

if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed"
    exit 1
fi
print_status "Docker Compose is installed"

if ! command_exists node; then
    print_error "Node.js is not installed"
    exit 1
fi
print_status "Node.js is installed"

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi
print_status "npm is installed"

echo ""

# Load environment variables
echo -e "${BLUE}🔧 Loading Environment Configuration${NC}"

if [ -f ".env.search" ]; then
    source .env.search
    print_status "Loaded search environment variables"
else
    print_warning "No .env.search file found, using defaults"
fi

if [ -f ".env.${ENVIRONMENT}" ]; then
    source ".env.${ENVIRONMENT}"
    print_status "Loaded ${ENVIRONMENT} environment variables"
fi

echo ""

# Deploy infrastructure
if [ "$SKIP_INFRASTRUCTURE" != "true" ]; then
    echo -e "${BLUE}🏗️ Deploying Infrastructure${NC}"
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN: Would deploy infrastructure"
    else
        # Stop existing containers
        echo "Stopping existing containers..."
        docker-compose -f infrastructure/docker-compose.search.yml down || true
        
        # Pull latest images
        echo "Pulling latest images..."
        docker-compose -f infrastructure/docker-compose.search.yml pull
        
        # Start infrastructure
        echo "Starting infrastructure..."
        docker-compose -f infrastructure/docker-compose.search.yml up -d
        
        # Wait for services to be ready
        echo "Waiting for services to be ready..."
        sleep 30
        
        # Check Elasticsearch health
        echo "Checking Elasticsearch health..."
        max_attempts=30
        attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if curl -s http://localhost:9200/_cluster/health | grep -q '"status":"green\|yellow"'; then
                print_status "Elasticsearch is ready"
                break
            fi
            
            if [ $attempt -eq $max_attempts ]; then
                print_error "Elasticsearch failed to start"
                exit 1
            fi
            
            echo "Attempt $attempt/$max_attempts - waiting for Elasticsearch..."
            sleep 10
            ((attempt++))
        done
        
        # Check Redis health
        echo "Checking Redis health..."
        if redis-cli -h localhost -p 6379 ping | grep -q "PONG"; then
            print_status "Redis is ready"
        else
            print_error "Redis failed to start"
            exit 1
        fi
    fi
    
    print_status "Infrastructure deployment completed"
    echo ""
else
    print_warning "Skipping infrastructure deployment"
    echo ""
fi

# Install dependencies
echo -e "${BLUE}📦 Installing Dependencies${NC}"

if [ "$DRY_RUN" = "true" ]; then
    print_warning "DRY RUN: Would install dependencies"
else
    npm install
    print_status "Dependencies installed"
fi

echo ""

# Build application
echo -e "${BLUE}🔨 Building Application${NC}"

if [ "$DRY_RUN" = "true" ]; then
    print_warning "DRY RUN: Would build application"
else
    npm run build
    print_status "Application built"
fi

echo ""

# Run database migrations
echo -e "${BLUE}🗄️ Running Database Migrations${NC}"

if [ "$DRY_RUN" = "true" ]; then
    print_warning "DRY RUN: Would run database migrations"
else
    npx prisma migrate deploy
    print_status "Database migrations completed"
fi

echo ""

# Setup search system
echo -e "${BLUE}🔍 Setting Up Search System${NC}"

if [ "$DRY_RUN" = "true" ]; then
    print_warning "DRY RUN: Would setup search system"
else
    # Run search setup script
    npm run search:setup
    print_status "Search system setup completed"
fi

echo ""

# Configure Elasticsearch performance settings
echo -e "${BLUE}⚡ Configuring Performance Settings${NC}"

if [ "$DRY_RUN" = "true" ]; then
    print_warning "DRY RUN: Would configure performance settings"
else
    # Apply Elasticsearch performance configuration
    if [ -f "infrastructure/config/elasticsearch-performance.json" ]; then
        echo "Applying Elasticsearch performance settings..."
        
        # Apply index templates
        curl -X PUT "localhost:9200/_index_template/marketplace_products_template" \
            -H "Content-Type: application/json" \
            -d @infrastructure/config/elasticsearch-performance.json || true
        
        print_status "Performance settings applied"
    else
        print_warning "Performance configuration file not found"
    fi
fi

echo ""

# Start application
echo -e "${BLUE}🚀 Starting Application${NC}"

if [ "$DRY_RUN" = "true" ]; then
    print_warning "DRY RUN: Would start application"
else
    if [ "$ENVIRONMENT" = "production" ]; then
        npm run start:prod &
    else
        npm run start:dev &
    fi
    
    APP_PID=$!
    echo "Application started with PID: $APP_PID"
    
    # Wait for application to be ready
    echo "Waiting for application to be ready..."
    sleep 10
    
    # Health check
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000/health | grep -q '"status":"ok"'; then
            print_status "Application is ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Application failed to start"
            kill $APP_PID 2>/dev/null || true
            exit 1
        fi
        
        echo "Attempt $attempt/$max_attempts - waiting for application..."
        sleep 5
        ((attempt++))
    done
fi

echo ""

# Run health checks
echo -e "${BLUE}🏥 Running Health Checks${NC}"

if [ "$DRY_RUN" = "true" ]; then
    print_warning "DRY RUN: Would run health checks"
else
    # Check search system health
    if curl -s http://localhost:3000/api/search/health | grep -q '"status":"healthy"'; then
        print_status "Search system is healthy"
    else
        print_warning "Search system health check failed"
    fi
    
    # Check Elasticsearch health
    if curl -s http://localhost:3000/api/search/health/elasticsearch | grep -q '"status":"healthy"'; then
        print_status "Elasticsearch is healthy"
    else
        print_warning "Elasticsearch health check failed"
    fi
    
    # Check Redis health
    if curl -s http://localhost:3000/api/search/health/redis | grep -q '"status":"healthy"'; then
        print_status "Redis is healthy"
    else
        print_warning "Redis health check failed"
    fi
fi

echo ""

# Display deployment summary
echo -e "${BLUE}📊 Deployment Summary${NC}"
echo "=================================="
echo "Environment: $ENVIRONMENT"
echo "Infrastructure: $([ "$SKIP_INFRASTRUCTURE" = "true" ] && echo "Skipped" || echo "Deployed")"
echo "Application: $([ "$DRY_RUN" = "true" ] && echo "Dry Run" || echo "Deployed")"
echo ""

if [ "$DRY_RUN" != "true" ]; then
    echo "🌐 Service URLs:"
    echo "  Application: http://localhost:3000"
    echo "  Search API: http://localhost:3000/api/search"
    echo "  Health Check: http://localhost:3000/api/search/health"
    echo "  Elasticsearch: http://localhost:9200"
    echo "  Kibana: http://localhost:5601"
    echo "  Redis Commander: http://localhost:8081"
    echo ""
    
    echo "📚 Documentation:"
    echo "  API Docs: http://localhost:3000/api/docs"
    echo "  Search API: http://localhost:3000/api/docs#/Search%20%26%20Discovery"
    echo ""
    
    echo "🔧 Management Commands:"
    echo "  Reindex: npm run search:reindex"
    echo "  Health Check: curl http://localhost:3000/api/search/health"
    echo "  Stop Infrastructure: docker-compose -f infrastructure/docker-compose.search.yml down"
fi

echo ""
print_status "Search System Deployment Completed Successfully! 🎉"

# Save deployment info
if [ "$DRY_RUN" != "true" ]; then
    cat > deployment-info.json << EOF
{
  "deploymentDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "$ENVIRONMENT",
  "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "services": {
    "elasticsearch": "http://localhost:9200",
    "redis": "localhost:6379",
    "application": "http://localhost:3000"
  }
}
EOF
    print_status "Deployment info saved to deployment-info.json"
fi