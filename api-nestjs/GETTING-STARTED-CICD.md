# 🚀 Getting Started with CI/CD Pipeline

This guide will walk you through setting up and using the CI/CD pipeline for your NestJS e-commerce API.

## 📋 Prerequisites

Before you start, ensure you have:
- [x] GitHub repository with the code
- [x] GitHub CLI installed (`gh` command)
- [x] AWS account with appropriate permissions
- [x] Slack workspace (optional, for notifications)
- [x] Docker installed locally (for testing)

## 🎯 Quick Start (5 Minutes)

### Step 1: Push the CI/CD Files to GitHub
```bash
# Navigate to your project
cd api-nestjs

# Add all CI/CD files
git add .github/ scripts/ docker-compose.ci.yml README-CICD.md GETTING-STARTED-CICD.md

# Commit the changes
git commit -m "feat: add comprehensive CI/CD pipeline"

# Push to GitHub
git push origin main
```

### Step 2: Set Up Basic Secrets
```bash
# Install GitHub CLI if not already installed
# Windows: winget install GitHub.cli
# Mac: brew install gh
# Linux: See https://cli.github.com/

# Login to GitHub
gh auth login

# Set basic secrets manually (we'll automate this later)
gh secret set JWT_SECRET --body "your-super-secret-jwt-key-change-in-production"
gh secret set JWT_REFRESH_SECRET --body "your-super-secret-refresh-key-change-in-production"
```

### Step 3: Test the Pipeline
```bash
# Make a small change to trigger the pipeline
echo "# CI/CD Pipeline Active" >> README.md
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

🎉 **Your CI/CD pipeline is now running!** Check GitHub Actions tab to see it in action.

---

## 🔧 Complete Setup Guide

### Phase 1: Repository Setup (10 minutes)

#### 1.1 Verify Files Are in Place
Check that these files exist in your repository:
```
.github/
├── workflows/
│   ├── ci.yml                    # Main CI pipeline
│   ├── cd-staging.yml           # Staging deployment
│   ├── cd-production.yml        # Production deployment
│   ├── security-scan.yml        # Security scanning
│   ├── performance-test.yml     # Performance testing
│   └── cleanup.yml              # Maintenance
├── dependabot.yml               # Dependency updates
├── PULL_REQUEST_TEMPLATE.md     # PR template
└── ISSUE_TEMPLATE/              # Issue templates
scripts/
└── setup-secrets.sh             # Secret setup script
docker-compose.ci.yml            # CI testing environment
```

#### 1.2 Enable GitHub Actions
1. Go to your GitHub repository
2. Click **Actions** tab
3. If prompted, click **"I understand my workflows, go ahead and enable them"**

### Phase 2: Configure Secrets (15 minutes)

#### 2.1 Run the Automated Setup Script
```bash
# Make script executable (Linux/Mac)
chmod +x scripts/setup-secrets.sh

# Run the interactive setup
./scripts/setup-secrets.sh
```

#### 2.2 Manual Secret Setup (Alternative)
If the script doesn't work, set secrets manually:

```bash
# Required secrets for basic functionality
gh secret set JWT_SECRET --body "your-jwt-secret-min-32-chars"
gh secret set JWT_REFRESH_SECRET --body "your-refresh-secret-min-32-chars"

# Optional: Slack notifications
gh secret set SLACK_WEBHOOK --body "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# For security scanning (optional)
gh secret set SNYK_TOKEN --body "your-snyk-token"
```

#### 2.3 Verify Secrets
```bash
# List all secrets
gh secret list
```

### Phase 3: Test the Pipeline (10 minutes)

#### 3.1 Test CI Pipeline
```bash
# Create a test branch
git checkout -b test/ci-pipeline

# Make a small change
echo "console.log('Testing CI pipeline');" > test-ci.js
git add test-ci.js
git commit -m "test: add CI pipeline test"
git push origin test/ci-pipeline

# Create a pull request
gh pr create --title "Test CI Pipeline" --body "Testing the CI/CD pipeline setup"
```

#### 3.2 Monitor the Pipeline
1. Go to GitHub → **Actions** tab
2. Watch the **CI Pipeline** workflow run
3. Check each job: Lint, Test, Build, Security Scan

#### 3.3 Merge and Test Staging
```bash
# Merge the PR (this will trigger staging deployment)
gh pr merge --merge
```

---

## 🏗️ AWS Infrastructure Setup

### Phase 4: AWS Setup (30 minutes)

#### 4.1 Create ECS Clusters
```bash
# Install AWS CLI if not already installed
# Configure AWS credentials
aws configure

# Create staging cluster
aws ecs create-cluster --cluster-name marketplace-staging

# Create production cluster  
aws ecs create-cluster --cluster-name marketplace-production
```

#### 4.2 Create Task Definitions
Create `task-definition-staging.json`:
```json
{
  "family": "marketplace-api-staging",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "ghcr.io/YOUR_USERNAME/YOUR_REPO/api:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "staging"},
        {"name": "PORT", "value": "3001"}
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:region:account:secret:staging/database-url"},
        {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:region:account:secret:staging/jwt-secret"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/marketplace-api-staging",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register the task definition:
```bash
aws ecs register-task-definition --cli-input-json file://task-definition-staging.json
```

#### 4.3 Create ECS Services
```bash
# Create staging service
aws ecs create-service \
  --cluster marketplace-staging \
  --service-name marketplace-api-staging \
  --task-definition marketplace-api-staging \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

#### 4.4 Set Up Load Balancer
1. Create Application Load Balancer in AWS Console
2. Configure target groups for ECS services
3. Set up SSL certificates
4. Configure health checks to `/api/v1/health`

#### 4.5 Configure AWS Secrets
```bash
# Add AWS credentials to GitHub secrets
gh secret set AWS_ACCESS_KEY_ID --body "your-aws-access-key"
gh secret set AWS_SECRET_ACCESS_KEY --body "your-aws-secret-key"
gh secret set AWS_REGION --body "us-east-1"

# Production credentials
gh secret set AWS_ACCESS_KEY_ID_PROD --body "your-prod-aws-access-key"
gh secret set AWS_SECRET_ACCESS_KEY_PROD --body "your-prod-aws-secret-key"
```

---

## 🔄 Daily Usage Workflows

### Development Workflow

#### 1. Feature Development
```bash
# 1. Create feature branch
git checkout -b feature/user-authentication
git push -u origin feature/user-authentication

# 2. Develop your feature
# ... make changes ...

# 3. Commit changes
git add .
git commit -m "feat: implement user authentication"
git push

# 4. Create pull request
gh pr create \
  --title "feat: implement user authentication" \
  --body "Implements JWT-based user authentication with refresh tokens"

# 5. CI pipeline runs automatically
# - Code quality checks
# - Security scans  
# - Unit tests
# - Integration tests
```

#### 2. Code Review Process
1. **Reviewer gets notified** via GitHub
2. **CI pipeline must pass** before merge
3. **Security scans** must be clean
4. **Test coverage** must be maintained
5. **Manual review** and approval

#### 3. Merge and Deploy
```bash
# After approval, merge PR
gh pr merge --squash

# This automatically triggers:
# ✅ Staging deployment
# ✅ Smoke tests
# ✅ Slack notification
```

### Release Workflow

#### 1. Prepare Release
```bash
# 1. Create release branch
git checkout -b release/v1.2.0
git push -u origin release/v1.2.0

# 2. Update version
npm version 1.2.0

# 3. Update CHANGELOG.md
echo "## [1.2.0] - $(date +%Y-%m-%d)" >> CHANGELOG.md
echo "### Added" >> CHANGELOG.md
echo "- New user authentication system" >> CHANGELOG.md

# 4. Commit and push
git add .
git commit -m "chore: prepare release v1.2.0"
git push
```

#### 2. Create GitHub Release
```bash
# Create release (this triggers production deployment)
gh release create v1.2.0 \
  --title "Release v1.2.0" \
  --notes "$(cat CHANGELOG.md | head -20)" \
  --target main
```

#### 3. Monitor Production Deployment
1. Go to **GitHub Actions** → **Deploy to Production**
2. Watch the deployment progress:
   - ✅ Pre-deployment checks
   - ✅ Database migrations
   - ✅ Blue-green deployment
   - ✅ Health checks
   - ✅ Traffic switching

### Hotfix Workflow

#### 1. Emergency Fix
```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# 2. Apply fix
# ... make critical changes ...

# 3. Commit and push
git add .
git commit -m "fix: resolve critical security vulnerability"
git push -u origin hotfix/critical-security-fix

# 4. Create urgent PR
gh pr create \
  --title "🚨 HOTFIX: Critical Security Fix" \
  --body "Resolves critical security vulnerability in authentication" \
  --label "hotfix,critical"
```

#### 2. Emergency Deployment
```bash
# After PR approval and merge, deploy immediately
gh workflow run "Deploy to Production" \
  --field version=latest \
  --field skip_tests=false
```

---

## 📊 Monitoring and Maintenance

### Daily Monitoring

#### 1. Check Pipeline Health
```bash
# View recent workflow runs
gh run list --limit 10

# Check specific workflow
gh run view --log
```

#### 2. Monitor Deployments
- **Staging**: https://api-staging.yourdomain.com/api/v1/health
- **Production**: https://api.yourdomain.com/api/v1/health

#### 3. Review Security Scans
1. Go to **GitHub** → **Security** tab
2. Check **Code scanning alerts**
3. Review **Dependabot alerts**
4. Monitor **Secret scanning**

### Weekly Maintenance

#### 1. Review Performance Reports
- Check **Actions** → **Performance Testing** results
- Monitor response times and error rates
- Review k6 test reports

#### 2. Update Dependencies
- **Dependabot** creates PRs automatically
- Review and merge dependency updates
- Test thoroughly after updates

#### 3. Clean Up Resources
- **Cleanup workflow** runs automatically on Sundays
- Monitor storage usage
- Review old artifacts and images

---

## 🚨 Troubleshooting

### Common Issues

#### 1. CI Pipeline Failures

**Problem**: Tests failing
```bash
# Check test logs
gh run view --log

# Run tests locally
npm test
npm run test:e2e
```

**Problem**: Security scan failures
```bash
# Check vulnerabilities
npm audit
npm audit fix

# Update dependencies
npm update
```

#### 2. Deployment Failures

**Problem**: Staging deployment fails
```bash
# Check ECS service status
aws ecs describe-services --cluster marketplace-staging --services marketplace-api-staging

# Check logs
aws logs tail /ecs/marketplace-api-staging --follow
```

**Problem**: Health checks failing
```bash
# Test health endpoint locally
curl http://localhost:3001/api/v1/health

# Check database connectivity
npm run prisma:studio
```

#### 3. Secret Issues

**Problem**: Missing secrets
```bash
# List current secrets
gh secret list

# Add missing secret
gh secret set SECRET_NAME --body "secret-value"
```

### Getting Help

#### 1. Check Documentation
- Read `README-CICD.md` for detailed information
- Check workflow files for specific configurations
- Review AWS documentation for infrastructure issues

#### 2. Debug Locally
```bash
# Test CI environment locally
docker-compose -f docker-compose.ci.yml up

# Run specific tests
npm run test:unit
npm run test:integration
npm run test:e2e
```

#### 3. Contact Support
- Create GitHub issue with `bug` label
- Include workflow run logs
- Provide environment details

---

## 🎯 Best Practices

### Development
- ✅ **Always create feature branches**
- ✅ **Write tests for new features**
- ✅ **Keep commits small and focused**
- ✅ **Use conventional commit messages**
- ✅ **Review security scan results**

### Deployment
- ✅ **Test in staging first**
- ✅ **Monitor deployments closely**
- ✅ **Have rollback plan ready**
- ✅ **Update documentation**
- ✅ **Communicate changes to team**

### Security
- ✅ **Rotate secrets regularly**
- ✅ **Monitor security alerts**
- ✅ **Keep dependencies updated**
- ✅ **Review access permissions**
- ✅ **Follow security guidelines**

---

## 🚀 Next Steps

1. **Complete AWS setup** following Phase 4
2. **Test full deployment cycle** with a sample feature
3. **Set up monitoring dashboards** in AWS CloudWatch
4. **Configure Slack notifications** for your team
5. **Train team members** on the workflow
6. **Set up production monitoring** and alerting

## 📞 Support

For questions or issues:
- 📖 Check the documentation first
- 🐛 Create a GitHub issue for bugs
- 💡 Use discussions for questions
- 🚨 Use security issue template for vulnerabilities

---

**🎉 Congratulations! Your CI/CD pipeline is ready for production use!**