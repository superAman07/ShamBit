# Production Deployment Checklist

## ✅ Security Configuration

### Environment Variables
- [ ] Copy `.env.production.example` to `.env` and configure all values
- [ ] Generate secure JWT secrets (min 32 chars): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Generate secure encryption key (min 32 chars)
- [ ] Set `NODE_ENV=production`
- [ ] Set `SKIP_TEST_DATA=true`
- [ ] Set `SKIP_INVENTORY_SEEDING=true`

### CORS Configuration
- [ ] Update `CORS_ORIGIN` with your actual frontend domain(s)
- [ ] Remove wildcard `*` from CORS_ORIGIN in production
- [ ] Example: `CORS_ORIGIN=https://admin.yourdomain.com,https://yourdomain.com`

### Database
- [ ] Use production database credentials
- [ ] Enable SSL/TLS for database connections
- [ ] Configure connection pooling (DB_POOL_MIN=2, DB_POOL_MAX=10)
- [ ] Set up automated backups
- [ ] Run migrations: `npm run db:migrate`

### Firebase (Push Notifications)
- [ ] Create Firebase project
- [ ] Generate service account key from Firebase Console
- [ ] Configure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
- [ ] Review Firebase security rules

## ✅ API Configuration

### Rate Limiting
- [ ] Review and adjust rate limits based on expected traffic
- [ ] Current: 100 requests per minute per IP
- [ ] Consider implementing user-based rate limiting for authenticated endpoints

### Logging
- [ ] Set `LOG_LEVEL=INFO` (or WARN/ERROR for production)
- [ ] Configure log rotation (already configured with winston-daily-rotate-file)
- [ ] Set up log aggregation service (e.g., CloudWatch, Datadog, Loggly)

### File Uploads
- [ ] Configure persistent storage for uploads (S3, CloudFront, etc.)
- [ ] Current: Local filesystem at `/uploads`
- [ ] Set up CDN for static assets

## ✅ Admin Portal Configuration

### Build Configuration
- [ ] Set `VITE_API_BASE_URL` in deployment platform
- [ ] Example: `VITE_API_BASE_URL=https://api.yourdomain.com/api/v1`
- [ ] Build with: `npm run build`
- [ ] Verify production build removes console.logs

### Deployment
- [ ] Deploy to static hosting (Vercel, Netlify, S3+CloudFront)
- [ ] Configure custom domain
- [ ] Enable HTTPS/SSL
- [ ] Set up CDN caching

## ✅ Infrastructure

### Server Configuration
- [ ] Use process manager (PM2, systemd) for API service
- [ ] Configure auto-restart on failure
- [ ] Set up health check monitoring
- [ ] Configure reverse proxy (Nginx, Caddy)
- [ ] Enable HTTPS with valid SSL certificate

### Performance
- [ ] Enable gzip/brotli compression (already configured)
- [ ] Configure caching headers
- [ ] Set up CDN for static assets
- [ ] Monitor memory usage and optimize if needed

### Monitoring
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure error tracking (Sentry, Rollbar)
- [ ] Set up performance monitoring (New Relic, Datadog)
- [ ] Monitor database performance

## ✅ Security Hardening

### API Security
- [x] Helmet.js configured for security headers
- [x] SQL injection prevention middleware
- [x] XSS prevention middleware
- [x] Rate limiting enabled
- [x] Input validation with Zod
- [ ] Review and test all security middleware
- [ ] Set up WAF (Web Application Firewall) if using cloud provider

### Authentication
- [x] JWT-based authentication
- [x] Refresh token rotation
- [x] Password hashing with bcrypt
- [ ] Implement 2FA for admin accounts (future enhancement)
- [ ] Review token expiry times (15m access, 30d refresh)

### Network Security
- [ ] Configure firewall rules
- [ ] Restrict database access to API server only
- [ ] Use VPC/private network if available
- [ ] Enable DDoS protection

## ✅ Testing

### Pre-Deployment Testing
- [ ] Run all tests: `npm test`
- [ ] Test API endpoints with production-like data
- [ ] Test admin portal with production API
- [ ] Verify authentication flows
- [ ] Test file upload functionality
- [ ] Verify push notifications work

### Load Testing
- [ ] Perform load testing on API endpoints
- [ ] Test database connection pool under load
- [ ] Verify rate limiting works correctly

## ✅ Deployment Steps

### Initial Deployment
1. [ ] Set up production database
2. [ ] Run database migrations
3. [ ] Configure environment variables
4. [ ] Build application: `npm run deploy:build`
5. [ ] Deploy API service
6. [ ] Deploy admin portal
7. [ ] Verify health check endpoint: `/health`
8. [ ] Test critical user flows

### Post-Deployment
- [ ] Monitor logs for errors
- [ ] Check database connections
- [ ] Verify API response times
- [ ] Test admin portal functionality
- [ ] Monitor memory and CPU usage

## ✅ Maintenance

### Regular Tasks
- [ ] Review and rotate secrets quarterly
- [ ] Update dependencies monthly: `npm outdated` then `npm update`
- [ ] Review security advisories: `npm audit`
- [ ] Monitor disk space for logs and uploads
- [ ] Review and optimize database queries
- [ ] Backup database regularly

### Documentation
- [ ] Document deployment process
- [ ] Document environment variables
- [ ] Document API endpoints
- [ ] Create runbook for common issues
- [ ] Document rollback procedure

## 🔧 Known Issues to Address

### Security Vulnerabilities
- [ ] Update express to 4.22.0+ (currently has low severity vulnerability)
- [ ] Update vite/esbuild (moderate severity - dev dependency only)
- [ ] Run: `npm audit fix` and test thoroughly

### Dependency Updates
- [ ] Consider updating major dependencies (see `npm outdated`)
- [ ] Test thoroughly after updates
- [ ] Update React to v19 (breaking changes - plan carefully)

## 📝 Platform-Specific Configuration

### Railway
- Configuration in `railway.json`
- Health check: `/health`
- Auto-restart on failure configured

### Render
- Configuration in `render.yaml`
- Database connection auto-configured
- Secrets need manual configuration in dashboard

### Manual Deployment
- Use PM2 or systemd for process management
- Configure Nginx as reverse proxy
- Set up SSL with Let's Encrypt
- Configure log rotation

## 🚨 Critical Production Settings

**NEVER commit these to git:**
- `.env` file with production secrets
- Database credentials
- JWT secrets
- Firebase private keys
- API keys

**Always verify:**
- `NODE_ENV=production`
- `SKIP_TEST_DATA=true`
- `SKIP_INVENTORY_SEEDING=true`
- CORS_ORIGIN is not `*`
- JWT secrets are strong and unique
- Database uses production credentials
