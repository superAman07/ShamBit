#!/bin/bash

# Test CI/CD Pipeline Script
# This script helps you test the CI/CD pipeline step by step

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 CI/CD Pipeline Testing Script${NC}"
echo "=================================="
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking Prerequisites...${NC}"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    exit 1
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Get repository information
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}📁 Repository: $REPO${NC}"
echo -e "${BLUE}🌿 Current branch: $CURRENT_BRANCH${NC}"
echo ""

# Function to wait for workflow completion
wait_for_workflow() {
    local workflow_name=$1
    local max_wait=${2:-300} # 5 minutes default
    local wait_time=0
    
    echo -e "${YELLOW}⏳ Waiting for workflow '$workflow_name' to complete...${NC}"
    
    while [ $wait_time -lt $max_wait ]; do
        local status=$(gh run list --workflow="$workflow_name" --limit=1 --json status -q '.[0].status')
        
        if [ "$status" = "completed" ]; then
            local conclusion=$(gh run list --workflow="$workflow_name" --limit=1 --json conclusion -q '.[0].conclusion')
            if [ "$conclusion" = "success" ]; then
                echo -e "${GREEN}✅ Workflow completed successfully${NC}"
                return 0
            else
                echo -e "${RED}❌ Workflow failed with conclusion: $conclusion${NC}"
                return 1
            fi
        elif [ "$status" = "in_progress" ] || [ "$status" = "queued" ]; then
            echo -e "${YELLOW}⏳ Workflow is $status... (${wait_time}s elapsed)${NC}"
            sleep 10
            wait_time=$((wait_time + 10))
        else
            echo -e "${RED}❌ Unexpected workflow status: $status${NC}"
            return 1
        fi
    done
    
    echo -e "${RED}❌ Workflow timed out after ${max_wait} seconds${NC}"
    return 1
}

# Test 1: Check if workflow files exist
echo -e "${BLUE}🔍 Test 1: Checking Workflow Files${NC}"
echo "================================="

WORKFLOW_FILES=(
    ".github/workflows/ci.yml"
    ".github/workflows/cd-staging.yml"
    ".github/workflows/cd-production.yml"
    ".github/workflows/security-scan.yml"
    ".github/workflows/performance-test.yml"
    ".github/workflows/cleanup.yml"
)

for file in "${WORKFLOW_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
        exit 1
    fi
done
echo ""

# Test 2: Check required secrets
echo -e "${BLUE}🔐 Test 2: Checking Required Secrets${NC}"
echo "===================================="

REQUIRED_SECRETS=(
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
)

OPTIONAL_SECRETS=(
    "SLACK_WEBHOOK"
    "SNYK_TOKEN"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_REGION"
)

echo "Required secrets:"
for secret in "${REQUIRED_SECRETS[@]}"; do
    if gh secret list | grep -q "$secret"; then
        echo -e "${GREEN}✅ $secret is set${NC}"
    else
        echo -e "${RED}❌ $secret is missing${NC}"
        echo "Set it with: gh secret set $secret --body 'your-secret-value'"
    fi
done

echo ""
echo "Optional secrets:"
for secret in "${OPTIONAL_SECRETS[@]}"; do
    if gh secret list | grep -q "$secret"; then
        echo -e "${GREEN}✅ $secret is set${NC}"
    else
        echo -e "${YELLOW}⚠️  $secret is not set (optional)${NC}"
    fi
done
echo ""

# Test 3: Test CI Pipeline
echo -e "${BLUE}🧪 Test 3: Testing CI Pipeline${NC}"
echo "==============================="

read -p "Do you want to test the CI pipeline? This will create a test branch and PR. (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    TEST_BRANCH="test/ci-pipeline-$(date +%s)"
    
    echo -e "${YELLOW}🌿 Creating test branch: $TEST_BRANCH${NC}"
    git checkout -b "$TEST_BRANCH"
    
    # Create a test file
    echo "// Test file for CI pipeline - $(date)" > test-ci-pipeline.js
    echo "console.log('CI pipeline test successful');" >> test-ci-pipeline.js
    
    git add test-ci-pipeline.js
    git commit -m "test: add CI pipeline test file"
    git push -u origin "$TEST_BRANCH"
    
    echo -e "${YELLOW}📝 Creating pull request...${NC}"
    PR_URL=$(gh pr create \
        --title "🧪 Test CI Pipeline" \
        --body "This PR tests the CI/CD pipeline setup. It will be closed automatically after testing." \
        --label "test" \
        --draft)
    
    echo -e "${GREEN}✅ Pull request created: $PR_URL${NC}"
    
    # Wait for CI to complete
    if wait_for_workflow "CI Pipeline" 600; then
        echo -e "${GREEN}✅ CI Pipeline test passed${NC}"
        
        # Clean up
        echo -e "${YELLOW}🧹 Cleaning up test branch...${NC}"
        gh pr close --delete-branch
        git checkout "$CURRENT_BRANCH"
        
        echo -e "${GREEN}✅ Test cleanup completed${NC}"
    else
        echo -e "${RED}❌ CI Pipeline test failed${NC}"
        echo "Check the workflow logs: gh run view --log"
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  Skipping CI pipeline test${NC}"
fi
echo ""

# Test 4: Test Security Scanning
echo -e "${BLUE}🔒 Test 4: Testing Security Scan${NC}"
echo "================================="

read -p "Do you want to trigger a security scan? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🔍 Triggering security scan workflow...${NC}"
    
    gh workflow run "Security Scan"
    
    if wait_for_workflow "Security Scan" 600; then
        echo -e "${GREEN}✅ Security scan completed${NC}"
        echo "Check results in: Repository → Security → Code scanning"
    else
        echo -e "${RED}❌ Security scan failed${NC}"
        echo "Check the workflow logs: gh run view --log"
    fi
else
    echo -e "${YELLOW}⏭️  Skipping security scan test${NC}"
fi
echo ""

# Test 5: Check Health Endpoints
echo -e "${BLUE}🏥 Test 5: Testing Health Endpoints${NC}"
echo "==================================="

if command -v npm &> /dev/null && [ -f "package.json" ]; then
    echo -e "${YELLOW}🚀 Starting application locally...${NC}"
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  .env file not found, creating from .env.example${NC}"
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        else
            echo -e "${RED}❌ .env.example not found${NC}"
            echo "Please create .env file with required environment variables"
        fi
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        npm install
    fi
    
    # Start the application in background
    echo -e "${YELLOW}🚀 Starting application...${NC}"
    npm run start:dev &
    APP_PID=$!
    
    # Wait for application to start
    echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
    sleep 10
    
    # Test health endpoints
    if command -v curl &> /dev/null; then
        echo -e "${YELLOW}🔍 Testing health endpoints...${NC}"
        
        if curl -f http://localhost:3001/api/v1/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health endpoint is working${NC}"
        else
            echo -e "${RED}❌ Health endpoint is not responding${NC}"
        fi
        
        if curl -f http://localhost:3001/api/v1/health/live > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Liveness endpoint is working${NC}"
        else
            echo -e "${RED}❌ Liveness endpoint is not responding${NC}"
        fi
        
        if curl -f http://localhost:3001/api/v1/health/ready > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Readiness endpoint is working${NC}"
        else
            echo -e "${RED}❌ Readiness endpoint is not responding${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  curl not available, skipping endpoint tests${NC}"
    fi
    
    # Stop the application
    echo -e "${YELLOW}🛑 Stopping application...${NC}"
    kill $APP_PID 2>/dev/null || true
    sleep 2
    
else
    echo -e "${YELLOW}⚠️  Node.js/npm not available or package.json not found${NC}"
    echo "Skipping local application test"
fi
echo ""

# Test 6: Validate Docker Build
echo -e "${BLUE}🐳 Test 6: Testing Docker Build${NC}"
echo "==============================="

read -p "Do you want to test Docker build? This may take a few minutes. (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v docker &> /dev/null; then
        echo -e "${YELLOW}🔨 Building Docker image...${NC}"
        
        if docker build -t marketplace-api:test .; then
            echo -e "${GREEN}✅ Docker build successful${NC}"
            
            # Test running the container
            echo -e "${YELLOW}🚀 Testing Docker container...${NC}"
            
            # Create a test .env file for Docker
            cat > .env.docker.test << EOF
NODE_ENV=test
PORT=3001
DATABASE_URL=postgresql://test:test@localhost:5432/test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-jwt-secret-for-docker
JWT_REFRESH_SECRET=test-refresh-secret-for-docker
EOF
            
            if docker run --rm -d \
                --name marketplace-api-test \
                --env-file .env.docker.test \
                -p 3002:3001 \
                marketplace-api:test; then
                
                echo -e "${YELLOW}⏳ Waiting for container to start...${NC}"
                sleep 10
                
                # Test if container is responding
                if curl -f http://localhost:3002/api/v1/health > /dev/null 2>&1; then
                    echo -e "${GREEN}✅ Docker container is working${NC}"
                else
                    echo -e "${YELLOW}⚠️  Container started but health check failed (expected without database)${NC}"
                fi
                
                # Stop and remove container
                docker stop marketplace-api-test > /dev/null 2>&1 || true
                echo -e "${GREEN}✅ Docker test completed${NC}"
            else
                echo -e "${RED}❌ Failed to run Docker container${NC}"
            fi
            
            # Clean up
            rm -f .env.docker.test
            
        else
            echo -e "${RED}❌ Docker build failed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Docker not available, skipping Docker test${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Skipping Docker build test${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo "==============="
echo ""
echo -e "${GREEN}✅ Completed Tests:${NC}"
echo "   - Workflow files validation"
echo "   - Secrets configuration check"
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   - CI pipeline functionality"
    echo "   - Security scanning"
fi
echo "   - Health endpoints (if applicable)"
echo "   - Docker build (if selected)"
echo ""

echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "1. Set up missing secrets if any were reported"
echo "2. Configure AWS infrastructure for deployments"
echo "3. Set up Slack webhooks for notifications"
echo "4. Test staging deployment with a real feature"
echo "5. Configure production environment"
echo ""

echo -e "${BLUE}📚 Useful Commands:${NC}"
echo "   - View workflow runs: gh run list"
echo "   - Check workflow logs: gh run view --log"
echo "   - List secrets: gh secret list"
echo "   - Trigger workflow: gh workflow run 'Workflow Name'"
echo ""

echo -e "${GREEN}🎉 Pipeline testing completed!${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Check the GitHub Actions tab in your repository to see all workflow runs${NC}"