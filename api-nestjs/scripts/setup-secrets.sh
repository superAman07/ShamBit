#!/bin/bash

# Setup Secrets Script for CI/CD Pipeline
# This script helps set up GitHub repository secrets for the CI/CD pipeline

set -e

echo "🔐 GitHub Repository Secrets Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed.${NC}"
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI.${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is installed and authenticated${NC}"
echo ""

# Get repository information
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "${BLUE}📁 Repository: $REPO${NC}"
echo ""

# Function to set secret
set_secret() {
    local secret_name=$1
    local secret_description=$2
    local is_required=${3:-true}
    
    echo -e "${YELLOW}🔑 Setting up: $secret_name${NC}"
    echo "   Description: $secret_description"
    
    if [ "$is_required" = true ]; then
        echo -n "   Enter value (required): "
    else
        echo -n "   Enter value (optional, press Enter to skip): "
    fi
    
    read -s secret_value
    echo ""
    
    if [ -z "$secret_value" ] && [ "$is_required" = true ]; then
        echo -e "${RED}   ❌ This secret is required. Skipping...${NC}"
        return 1
    elif [ -z "$secret_value" ]; then
        echo -e "${YELLOW}   ⏭️  Skipped${NC}"
        return 0
    fi
    
    if gh secret set "$secret_name" --body "$secret_value" --repo "$REPO"; then
        echo -e "${GREEN}   ✅ Successfully set $secret_name${NC}"
    else
        echo -e "${RED}   ❌ Failed to set $secret_name${NC}"
        return 1
    fi
    echo ""
}

# Function to set environment secret
set_env_secret() {
    local env_name=$1
    local secret_name=$2
    local secret_description=$3
    local is_required=${4:-true}
    
    echo -e "${YELLOW}🔑 Setting up environment secret: $secret_name (for $env_name)${NC}"
    echo "   Description: $secret_description"
    
    if [ "$is_required" = true ]; then
        echo -n "   Enter value (required): "
    else
        echo -n "   Enter value (optional, press Enter to skip): "
    fi
    
    read -s secret_value
    echo ""
    
    if [ -z "$secret_value" ] && [ "$is_required" = true ]; then
        echo -e "${RED}   ❌ This secret is required. Skipping...${NC}"
        return 1
    elif [ -z "$secret_value" ]; then
        echo -e "${YELLOW}   ⏭️  Skipped${NC}"
        return 0
    fi
    
    if gh secret set "$secret_name" --env "$env_name" --body "$secret_value" --repo "$REPO"; then
        echo -e "${GREEN}   ✅ Successfully set $secret_name for $env_name environment${NC}"
    else
        echo -e "${RED}   ❌ Failed to set $secret_name for $env_name environment${NC}"
        return 1
    fi
    echo ""
}

echo -e "${BLUE}🚀 Setting up CI/CD secrets...${NC}"
echo ""

# Repository-level secrets (used across all workflows)
echo -e "${BLUE}📋 Repository Secrets${NC}"
echo "===================="

set_secret "SNYK_TOKEN" "Snyk security scanning token" false
set_secret "CODECOV_TOKEN" "Codecov token for test coverage" false
set_secret "SLACK_WEBHOOK" "Slack webhook URL for notifications" false
set_secret "SECURITY_SLACK_WEBHOOK" "Slack webhook for security alerts" false

echo -e "${BLUE}📋 AWS Credentials (for staging)${NC}"
echo "================================"

set_secret "AWS_ACCESS_KEY_ID" "AWS access key for staging deployments"
set_secret "AWS_SECRET_ACCESS_KEY" "AWS secret key for staging deployments"
set_secret "AWS_REGION" "AWS region (e.g., us-east-1)"

echo -e "${BLUE}📋 Production AWS Credentials${NC}"
echo "============================="

set_secret "AWS_ACCESS_KEY_ID_PROD" "AWS access key for production deployments"
set_secret "AWS_SECRET_ACCESS_KEY_PROD" "AWS secret key for production deployments"

# Environment-specific secrets
echo -e "${BLUE}🌍 Environment-specific Secrets${NC}"
echo "==============================="

# Create environments if they don't exist
echo "Creating environments..."
gh api repos/$REPO/environments/staging --method PUT --field wait_timer=0 --field prevent_self_review=false > /dev/null 2>&1 || true
gh api repos/$REPO/environments/production --method PUT --field wait_timer=0 --field prevent_self_review=true > /dev/null 2>&1 || true

echo -e "${GREEN}✅ Environments created${NC}"
echo ""

# Staging environment secrets
echo -e "${BLUE}🧪 Staging Environment Secrets${NC}"
echo "=============================="

set_env_secret "staging" "DATABASE_URL_STAGING" "PostgreSQL connection string for staging"
set_env_secret "staging" "REDIS_URL_STAGING" "Redis connection string for staging"
set_env_secret "staging" "JWT_SECRET_STAGING" "JWT secret for staging"
set_env_secret "staging" "JWT_REFRESH_SECRET_STAGING" "JWT refresh secret for staging"

# Production environment secrets
echo -e "${BLUE}🚀 Production Environment Secrets${NC}"
echo "================================="

set_env_secret "production" "DATABASE_URL_PROD" "PostgreSQL connection string for production"
set_env_secret "production" "REDIS_URL_PROD" "Redis connection string for production"
set_env_secret "production" "JWT_SECRET_PROD" "JWT secret for production"
set_env_secret "production" "JWT_REFRESH_SECRET_PROD" "JWT refresh secret for production"

# Optional third-party service secrets
echo -e "${BLUE}🔌 Third-party Service Secrets (Optional)${NC}"
echo "========================================="

set_secret "RAZORPAY_KEY_ID" "Razorpay key ID for payments" false
set_secret "RAZORPAY_KEY_SECRET" "Razorpay key secret for payments" false
set_secret "STRIPE_SECRET_KEY" "Stripe secret key for payments" false
set_secret "TWILIO_ACCOUNT_SID" "Twilio account SID for SMS" false
set_secret "TWILIO_AUTH_TOKEN" "Twilio auth token for SMS" false
set_secret "SENDGRID_API_KEY" "SendGrid API key for emails" false
set_secret "FIREBASE_SERVICE_ACCOUNT" "Firebase service account JSON for push notifications" false

echo ""
echo -e "${GREEN}🎉 Secret setup completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Verify all secrets are set correctly in your repository settings"
echo "2. Update your environment variables in .env files"
echo "3. Test the CI/CD pipeline with a test commit"
echo "4. Set up your AWS ECS clusters and services"
echo "5. Configure your domain and SSL certificates"
echo ""
echo -e "${YELLOW}⚠️  Security Reminders:${NC}"
echo "- Never commit secrets to your repository"
echo "- Rotate secrets regularly"
echo "- Use least-privilege access for AWS credentials"
echo "- Monitor secret usage in GitHub Actions logs"
echo ""
echo -e "${GREEN}✅ Setup complete! Your CI/CD pipeline is ready to use.${NC}"