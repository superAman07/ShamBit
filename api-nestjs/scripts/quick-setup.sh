#!/bin/bash

# Quick Setup Script for CI/CD Pipeline
# This script provides a fast way to get the CI/CD pipeline running

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}⚡ Quick CI/CD Setup${NC}"
echo "==================="
echo ""

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI required. Install from: https://cli.github.com/${NC}"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}🔐 Please authenticate with GitHub:${NC}"
    gh auth login
fi

echo -e "${GREEN}✅ GitHub CLI ready${NC}"

# Set essential secrets
echo -e "${BLUE}🔑 Setting up essential secrets...${NC}"

# Generate secure secrets if not provided
JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 32)}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}

gh secret set JWT_SECRET --body "$JWT_SECRET"
gh secret set JWT_REFRESH_SECRET --body "$JWT_REFRESH_SECRET"

echo -e "${GREEN}✅ Essential secrets configured${NC}"

# Test the pipeline
echo -e "${BLUE}🧪 Testing pipeline...${NC}"

# Create test commit
echo "# CI/CD Pipeline Active - $(date)" >> README.md
git add README.md
git commit -m "test: activate CI/CD pipeline"
git push

echo -e "${GREEN}🎉 CI/CD pipeline is now active!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Check GitHub Actions tab for pipeline status"
echo "2. Set up AWS credentials for deployments"
echo "3. Configure Slack notifications (optional)"
echo ""
echo -e "${BLUE}🔗 Useful links:${NC}"
echo "- Actions: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions"
echo "- Settings: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/settings/secrets/actions"