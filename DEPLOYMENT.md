# ShamBit Deployment Guide

This guide covers deploying all components of the ShamBit platform to production.

## 🚀 Quick Deployment Overview

### Services & URLs
- **Website**: Landing page and seller registration (Netlify)
- **API**: Backend services (Railway/Render)
- **Admin Portal**: Management dashboard (Netlify/Vercel)
- **Database**: PostgreSQL (Railway/Render/Supabase)

## 📋 Pre-deployment Checklist

### Environment Variables
Ensure all required environment variables are set:

```bash
# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=shambit_prod
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# API
NODE_ENV=production
PORT=3000

# Optional Services
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
FIREBASE_PROJECT_ID=your-firebase-project
```

### Database Setup
1. Create production database
2. Run migrations: `npm run migrate:latest`
3. Seed initial data if needed: `npm run seed:run`

## 🌐 Website Deployment (Netlify)

### Method 1: Netlify CLI (Recommended)

```bash
cd Website

# Install dependencies
npm install

# Build the project
npm run build

# Login to Netlify (first time only)
netlify login

# Initialize site (first time only)
netlify init

# Deploy to production
netlify deploy --prod
```

### Method 2: Git Integration

1. Push code to GitHub/GitLab
2. Connect repository to Netlify
3. Set build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18`

### Environment Variables (Netlify)
```bash
# Set in Netlify dashboard
VITE_API_URL=https://your-api-domain.com
NODE_ENV=production
```

## 🔧 API Deployment (Railway)

### Method 1: Railway CLI

```bash
cd services/api

# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set DB_HOST=your-db-host
railway variables set DB_PASSWORD=your-db-password
railway variables set JWT_SECRET=your-jwt-secret

# Deploy
railway up
```

### Method 2: GitHub Integration

1. Push code to GitHub
2. Connect repository to Railway
3. Set root directory: `services/api`
4. Set start command: `npm start`
5. Configure environment variables

### Database Migration (Production)
```bash
# Run migrations on production
railway run npm run migrate:latest
```

## 📊 Admin Portal Deployment (Netlify)

```bash
cd services/admin-portal

# Install dependencies
npm install

# Build for production
npm run build:prod

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

### Environment Variables (Admin Portal)
```bash
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_APP_ENV=production
```

## 🐳 Docker Deployment (Alternative)

### Full Stack Deployment

```bash
# Build and run all services
docker-compose -f docker-compose.prod.yml up -d

# Or build individual services
docker build -t shambit-api ./services/api
docker build -t shambit-admin ./services/admin-portal
docker build -t shambit-website ./Website
```

### Docker Environment
Create `.env.production`:
```bash
NODE_ENV=production
DB_HOST=postgres
DB_NAME=shambit_prod
API_URL=http://api:3000
```

## 🔍 Health Checks & Monitoring

### API Health Check
```bash
curl https://your-api-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

### Website Health Check
```bash
curl https://your-website-domain.com
```

### Admin Portal Health Check
```bash
curl https://your-admin-domain.com
```

## 📈 Post-Deployment Tasks

### 1. Database Verification
```bash
# Check tables exist
psql -h your-db-host -U your-db-user -d shambit_prod -c "\dt"

# Verify seller table
psql -h your-db-host -U your-db-user -d shambit_prod -c "SELECT COUNT(*) FROM sellers;"
```

### 2. API Testing
```bash
# Test seller registration
curl -X POST https://your-api-domain.com/api/sellers/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Store",
    "businessType": "grocery",
    "ownerName": "Test Owner",
    "phone": "9876543210",
    "email": "test@example.com",
    "city": "Mumbai"
  }'
```

### 3. Admin Portal Access
1. Navigate to admin portal URL
2. Login with admin credentials
3. Verify seller management page loads
4. Check dashboard statistics

### 4. Website Testing
1. Navigate to website URL
2. Test seller registration form
3. Verify form submission works
4. Check responsive design

## 🔒 Security Checklist

### API Security
- [ ] JWT secrets are secure and rotated
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is working
- [ ] HTTPS is enforced

### Database Security
- [ ] Database credentials are secure
- [ ] Connection is encrypted (SSL)
- [ ] Backup strategy is in place
- [ ] Access is restricted to necessary IPs

### Frontend Security
- [ ] Environment variables don't contain secrets
- [ ] HTTPS is enforced
- [ ] CSP headers are configured
- [ ] XSS protection is enabled

## 🚨 Troubleshooting

### Common Issues

#### Website Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### API Connection Issues
- Check environment variables
- Verify database connectivity
- Check CORS configuration
- Review server logs

#### Database Migration Fails
```bash
# Rollback and retry
npm run migrate:rollback
npm run migrate:latest
```

#### Admin Portal Login Issues
- Verify API URL configuration
- Check JWT token configuration
- Review network requests in browser dev tools

### Logs & Monitoring

#### API Logs
```bash
# Railway logs
railway logs

# Docker logs
docker logs shambit-api
```

#### Database Logs
```bash
# PostgreSQL logs
tail -f /var/log/postgresql/postgresql.log
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- [ ] Monitor server resources
- [ ] Check database performance
- [ ] Review error logs
- [ ] Update dependencies
- [ ] Backup database
- [ ] Monitor SSL certificates

### Performance Monitoring
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure error tracking (Sentry)
- Monitor database performance
- Set up alerts for critical issues

### Scaling Considerations
- Database connection pooling
- CDN for static assets
- Load balancing for API
- Caching strategies
- Database read replicas

---

## 🎯 Production URLs (Update After Deployment)

```bash
# Update these after deployment
WEBSITE_URL=https://shambit.netlify.app
API_URL=https://shambit-api.railway.app
ADMIN_URL=https://shambit-admin.netlify.app
```

Remember to update the `netlify.toml` file with your actual API domain before deploying!