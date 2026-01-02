#!/bin/bash

# Test Runner Script for NestJS API
# This script runs different types of tests with proper setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 NestJS API Test Runner${NC}"
echo "=========================="
echo ""

# Function to run tests with proper error handling
run_test() {
    local test_type=$1
    local test_command=$2
    
    echo -e "${YELLOW}🔍 Running $test_type tests...${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_type tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_type tests failed${NC}"
        return 1
    fi
}

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Generate Prisma client
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npm run prisma:generate

# Parse command line arguments
TEST_TYPE=${1:-"all"}
COVERAGE=${2:-"false"}

case $TEST_TYPE in
    "unit")
        echo -e "${BLUE}🎯 Running unit tests only${NC}"
        if [ "$COVERAGE" = "true" ]; then
            run_test "Unit (with coverage)" "npm run test:unit -- --coverage"
        else
            run_test "Unit" "npm run test:unit"
        fi
        ;;
    
    "auth")
        echo -e "${BLUE}🔐 Running authentication tests${NC}"
        if [ "$COVERAGE" = "true" ]; then
            run_test "Auth (with coverage)" "npm run test:auth -- --coverage"
        else
            run_test "Auth" "npm run test:auth"
        fi
        ;;
    
    "e2e")
        echo -e "${BLUE}🌐 Running end-to-end tests${NC}"
        run_test "E2E" "npm run test:e2e"
        ;;
    
    "coverage")
        echo -e "${BLUE}📊 Running all tests with coverage${NC}"
        run_test "All (with coverage)" "npm run test:cov"
        ;;
    
    "ci")
        echo -e "${BLUE}🤖 Running CI tests${NC}"
        run_test "CI" "npm run test:ci"
        ;;
    
    "watch")
        echo -e "${BLUE}👀 Running tests in watch mode${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop watching${NC}"
        npm run test:watch
        ;;
    
    "all"|*)
        echo -e "${BLUE}🚀 Running all tests${NC}"
        
        # Run unit tests
        if ! run_test "Unit" "npm run test:unit"; then
            exit 1
        fi
        
        echo ""
        
        # Run E2E tests (if they exist)
        if [ -f "test/app.e2e-spec.ts" ] || find src -name "*.e2e-spec.ts" -type f | grep -q .; then
            if ! run_test "E2E" "npm run test:e2e"; then
                exit 1
            fi
        else
            echo -e "${YELLOW}⏭️  No E2E tests found, skipping${NC}"
        fi
        
        echo ""
        
        # Generate coverage report
        if [ "$COVERAGE" = "true" ]; then
            echo -e "${BLUE}📊 Generating coverage report...${NC}"
            npm run test:cov
        fi
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Test execution completed!${NC}"

# Show coverage report location if generated
if [ -d "coverage" ]; then
    echo -e "${BLUE}📊 Coverage report available at: coverage/lcov-report/index.html${NC}"
fi

echo ""
echo -e "${BLUE}💡 Usage examples:${NC}"
echo "  ./scripts/run-tests.sh unit          # Run unit tests only"
echo "  ./scripts/run-tests.sh auth          # Run auth tests only"
echo "  ./scripts/run-tests.sh coverage      # Run all tests with coverage"
echo "  ./scripts/run-tests.sh watch         # Run tests in watch mode"
echo "  ./scripts/run-tests.sh ci            # Run tests for CI"