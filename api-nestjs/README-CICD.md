# CI/CD Pipeline Documentation

This document describes the comprehensive CI/CD pipeline setup for the NestJS E-commerce API.

## 🚀 Overview

Our CI/CD pipeline provides:
- **Automated testing** on every push and pull request
- **Security scanning** with multiple tools
- **Automated deployments** to staging and production
- **Performance testing** and monitoring
- **Dependency management** with Dependabot
- **Comprehensive reporting** and notifications

## 📋 Pipeline Structure

### 1. Continuous Integration (CI)
**File**: `.github/workflows/ci.yml`

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs**:
1. **Code Quality & Security**
   - ESLint and Prettier checks
   - TypeScript compilation
   - npm audit for vulnerabilities
   - Snyk security scanning

2. **Database Validation**
   - Prisma schema validation
   - Database migration testing
   - PostgreSQL integration tests

3. **Testing**
   - Unit tests with coverage reporting
   - Integration tests with real database
   - E2E tests with full application stack

4. **Build & Docker**
   - Application build verification
   - Docker image creation and push
   - Multi-architecture support (AMD64, ARM64)

5. **Container Security**
   - Trivy vulnerability scanning
   - SARIF report generation

### 2. Continuous Deployment - Staging
**File**: `.github/workflows/cd-staging.yml`

**Triggers**:
- Successful completion of CI pipeline on `main` branch

**Process**:
1. Download deployment artifacts from CI
2. Deploy to AWS ECS staging cluster
3. Run smoke tests
4. Automatic rollback on failure
5. Slack notifications

### 3. Continuous Deployment - Production
**File**: `.github/workflows/cd-production.yml`

**Triggers**:
- GitHub releases (published)
- Manual workflow dispatch

**Process**:
1. Pre-deployment checks and validations
2. Database migration execution
3. Blue-green deployment to production
4. Health checks and verification
5. Automatic rollback on failure
6. Incident creation on failure

### 4. Security Scanning
**File**: `.github/workflows/security-scan.yml`

**Triggers**:
- Daily scheduled runs (2 AM UTC)
- Push to main branch
- Pull requests
- Manual dispatch

**Scans**:
- Dependency vulnerabilities (npm audit, Snyk)
- Code analysis (CodeQL)
- Secret scanning (TruffleHog)
- Container security (Trivy, Hadolint)

### 5. Performance Testing
**File**: `.github/workflows/performance-test.yml`

**Triggers**:
- Weekly scheduled runs (Sundays 3 AM UTC)
- Manual dispatch with parameters

**Tests**:
- Load testing with k6
- Stress testing
- Spike testing
- Performance reporting

### 6. Cleanup
**File**: `.github/workflows/cleanup.yml`

**Triggers**:
- Weekly scheduled runs (Sundays 1 AM UTC)
- Manual dispatch

**Cleanup**:
- Old artifacts (30+ days)
- Container images (keep latest 10)
- Workflow runs (90+ days)
- Caches (7+ days)

## 🔐 Required Secrets

### Repository Secrets
```bash
# Security & Monitoring
SNYK_TOKEN                    # Snyk security scanning
CODECOV_TOKEN                 # Code coverage reporting
SLACK_WEBHOOK                 # General notifications
SECURITY_SLACK_WEBHOOK        # Security alerts

# AWS Credentials (Staging)
AWS_ACCESS_KEY_ID             # AWS access key for staging
AWS_SECRET_ACCESS_KEY         # AWS secret key for staging
AWS_REGION                    # AWS region (e.g., us-east-1)

# AWS Credentials (Production)
AWS_ACCESS_KEY_ID_PROD        # AWS access key for production
AWS_SECRET_ACCESS_KEY_PROD    # AWS secret key for production

# Third-party Services (Optional)
RAZORPAY_KEY_ID              # Razorpay payments
RAZORPAY_KEY_SECRET          # Razorpay payments
STRIPE_SECRET_KEY            # Stripe payments
TWILIO_ACCOUNT_SID           # SMS notifications
TWILIO_AUTH_TOKEN            # SMS notifications
SENDGRID_API_KEY             # Email notifications
FIREBASE_SERVICE_ACCOUNT     # Push notifications
```

### Environment Secrets

#### Staging Environment
```bash
DATABASE_URL_STAGING          # PostgreSQL connection
REDIS_URL_STAGING            # Redis connection
JWT_SECRET_STAGING           # JWT signing key
JWT_REFRESH_SECRET_STAGING   # JWT refresh key
```

#### Production Environment
```bash
DATABASE_URL_PROD            # PostgreSQL connection
REDIS_URL_PROD              # Redis connection
JWT_SECRET_PROD             # JWT signing key
JWT_REFRESH_SECRET_PROD     # JWT refresh key
```

## 🛠️ Setup Instructions

### 1. Initial Setup

1. **Clone the repository** and ensure all workflow files are in place
2. **Run the setup script** to configure secrets:
   ```bash
   ./scripts/setup-secrets.sh
   ```
3. **Configure AWS infrastructure** (ECS clusters, load balancers, etc.)
4. **Set up monitoring** (CloudWatch, Slack webhooks)

### 2. AWS Infrastructure Requirements

#### ECS Clusters
- `marketplace-staging` - Staging environment
- `marketplace-production` - Production environment

#### ECS Services
- `marketplace-api-staging` - Staging API service
- `marketplace-api-production` - Production API service
- `marketplace-api-migration` - Database migration task

#### Load Balancers
- Application Load Balancer for each environment
- SSL certificates configured
- Health check endpoints configured

### 3. Database Setup

#### Migration Task Definition
Create an ECS task definition for running database migrations:
```json
{
  "family": "marketplace-api-migration",
  "containerDefinitions": [{
    "name": "api",
    "image": "ghcr.io/your-org/your-repo/api:latest",
    "command": ["npm", "run", "prisma:deploy"],
    "environment": [
      {"name": "DATABASE_URL", "value": "your-database-url"}
    ]
  }]
}
```

### 4. Monitoring Setup

#### CloudWatch Alarms
- API response time > 2 seconds
- Error rate > 5%
- CPU utilization > 80%
- Memory utilization > 80%

#### Slack Integration
1. Create Slack webhooks for notifications
2. Add webhook URLs to repository secrets
3. Configure notification channels

## 🔄 Workflow Usage

### Development Workflow

1. **Create feature branch** from `develop`
2. **Make changes** and commit
3. **Create pull request** to `develop`
4. **CI pipeline runs** automatically
5. **Review and merge** after CI passes
6. **Staging deployment** happens automatically

### Release Workflow

1. **Create release branch** from `develop`
2. **Update version** and changelog
3. **Merge to main** and create GitHub release
4. **Production deployment** triggers automatically
5. **Monitor deployment** and rollback if needed

### Hotfix Workflow

1. **Create hotfix branch** from `main`
2. **Apply critical fix**
3. **Create pull request** to `main`
4. **Emergency deployment** using manual dispatch
5. **Merge back to develop**

## 📊 Monitoring & Alerts

### GitHub Actions Monitoring
- Workflow run status
- Test results and coverage
- Security scan results
- Performance test results

### Application Monitoring
- Health check endpoints
- Response time metrics
- Error rate tracking
- Resource utilization

### Notification Channels
- Slack for general notifications
- Email for critical alerts
- GitHub issues for incidents

## 🚨 Incident Response

### Deployment Failures
1. **Automatic rollback** triggers
2. **Incident issue** created automatically
3. **Team notification** via Slack
4. **Investigation** and fix process

### Security Vulnerabilities
1. **Security scan** detects issues
2. **Security team** notified immediately
3. **Issue created** with details
4. **Fix and re-scan** process

### Performance Issues
1. **Performance tests** detect degradation
2. **Team notification** with metrics
3. **Investigation** and optimization
4. **Re-test** after fixes

## 🔧 Customization

### Adding New Environments
1. Create new environment in GitHub
2. Add environment-specific secrets
3. Update deployment workflows
4. Configure AWS infrastructure

### Adding New Tests
1. Add test files to appropriate directories
2. Update test scripts in `package.json`
3. Modify CI workflow if needed
4. Update coverage thresholds

### Adding New Security Scans
1. Add new scanning tools to security workflow
2. Configure tool-specific secrets
3. Update notification logic
4. Add results to security reports

## 📚 Best Practices

### Security
- Rotate secrets regularly
- Use least-privilege AWS policies
- Monitor secret usage
- Regular security audits

### Performance
- Monitor deployment times
- Optimize Docker builds
- Use caching effectively
- Regular performance testing

### Reliability
- Test rollback procedures
- Monitor error rates
- Set up proper alerting
- Document incident procedures

## 🆘 Troubleshooting

### Common Issues

#### CI Pipeline Failures
- Check test failures in logs
- Verify environment variables
- Check dependency conflicts
- Review security scan results

#### Deployment Failures
- Verify AWS credentials
- Check ECS service status
- Review load balancer health
- Check database connectivity

#### Performance Issues
- Review CloudWatch metrics
- Check database performance
- Monitor memory usage
- Analyze slow queries

### Getting Help
1. Check workflow logs in GitHub Actions
2. Review CloudWatch logs in AWS
3. Check Slack notifications
4. Create issue with details

## 📈 Metrics & KPIs

### Development Metrics
- Build success rate
- Test coverage percentage
- Security vulnerability count
- Code quality scores

### Deployment Metrics
- Deployment frequency
- Lead time for changes
- Mean time to recovery
- Change failure rate

### Performance Metrics
- API response times
- Error rates
- Throughput (requests/second)
- Resource utilization

---

## 🎯 Next Steps

1. **Set up AWS infrastructure** according to requirements
2. **Configure secrets** using the setup script
3. **Test the pipeline** with a sample deployment
4. **Monitor and optimize** based on metrics
5. **Train team** on workflow usage

For questions or issues, please create a GitHub issue or contact the DevOps team.