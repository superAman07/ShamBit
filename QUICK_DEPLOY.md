# Quick Deploy Guide - 30 Minutes to Production

## 🚀 Pre-Deployment (5 minutes)

### 1. Generate Secrets
```bash
npm run generate:secrets
```
Copy the output to your `.env` file or deployment platform.

### 2. Run Security Audit
```bash
npm run security:audit
```
Fix any critical issues before proceeding.

### 3. Test Build
```bash
npm run build
```
Ensure everything compiles successfully.

## 🎯 Choose Your Deployment Method

### Option A: Railway (Recommended) - 15 minutes

#### Step 1: Prepare Repository
```bash
git add .
git commit -m "Production ready"
git push origin main
```

#### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will detect `railway.json` automatically

#### Step 3: Add Database
1. Click "New" → "Database" → "PostgreSQL"
2. Railway auto-configures database connection

#### Step 4: Set Environment Variables
```bash
NODE_ENV=production
SKIP_TEST_DATA=true
SKIP_INVENTORY_SEEDING=true
JWT_SECRET=<from generate:secrets>
JWT_REFRESH_SECRET=<from generate:secrets>
ENCRYPTION_KEY=<from generate:secrets>
CORS_ORIGIN=https://your-domain.com
```

#### Step 5: Deploy
- Railway deploys automatically
- Check logs for any errors
- Visit your app URL

**Cost:** ~$10/month

---

### Option B: Render - 15 minutes

#### Step 1: Prepare Repository
```bash
git add .
git commit -m "Production ready"
git push origin main
```

#### Step 2: Deploy to Render
1. Go to [render.com](https://render.com)
2. Click "New" → "Blueprint"
3. Connect your repository
4. Render will detect `render.yaml` automatically

#### Step 3: Configure Secrets
In Render dashboard, set:
```bash
JWT_SECRET=<from generate:secrets>
JWT_REFRESH_SECRET=<from generate:secrets>
ENCRYPTION_KEY=<from generate:secrets>
FIREBASE_PROJECT_ID=<your-firebase-project>
FIREBASE_PRIVATE_KEY=<your-firebase-key>
FIREBASE_CLIENT_EMAIL=<your-firebase-email>
```

#### Step 4: Deploy
- Render deploys automatically
- Database is created automatically
- Check logs for any errors

**Cost:** ~$14/month

---

### Option C: Docker - 20 minutes

#### Step 1: Create Production .env
```bash
cp .env.production.example .env
# Edit .env with your values
```

#### Step 2: Generate Secrets
```bash
npm run generate:secrets
# Add to .env file
```

#### Step 3: Deploy with Docker Compose
```bash
docker-compose up -d
```

#### Step 4: Run Migrations
```bash
docker-compose exec api npm run db:migrate
```

#### Step 5: Verify
```bash
npm run health:check http://localhost:3000
```

**Cost:** VPS pricing (from $5/month)

---

### Option D: Manual VPS - 25 minutes

#### Step 1: Server Setup
```bash
# SSH into your server
ssh user@your-server.com

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib
```

#### Step 2: Clone and Setup
```bash
git clone <your-repo-url>
cd shambit-platform
npm install
```

#### Step 3: Configure Environment
```bash
cp .env.production.example .env
nano .env  # Edit with your values
```

#### Step 4: Build and Migrate
```bash
npm run build
npm run db:migrate
```

#### Step 5: Start with PM2
```bash
# Install PM2
npm install -g pm2

# Start API
pm2 start services/api/dist/index.js --name shambit-api

# Save PM2 config
pm2 save
pm2 startup
```

#### Step 6: Configure Nginx (Optional)
```bash
sudo cp nginx.conf /etc/nginx/sites-available/shambit
sudo ln -s /etc/nginx/sites-available/shambit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Cost:** VPS pricing (from $5/month)

---

## 🏥 Post-Deployment (5 minutes)

### 1. Verify Health
```bash
npm run health:check https://your-api-url.com
```

### 2. Test Critical Flows
- [ ] Admin login
- [ ] Product listing
- [ ] Order creation
- [ ] Delivery assignment

### 3. Set Up Monitoring
1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Create free account
3. Add monitor:
   - Type: HTTP(s)
   - URL: `https://your-api-url.com/health`
   - Interval: 5 minutes
4. Add alert contacts (email/SMS)

### 4. Check Logs
```bash
# Railway/Render: Check dashboard logs
# Docker: docker-compose logs -f api
# PM2: pm2 logs shambit-api
```

## ✅ Deployment Checklist

### Before Deployment
- [ ] Run `npm run generate:secrets`
- [ ] Run `npm run security:audit`
- [ ] Run `npm run build`
- [ ] Test locally with `npm start`
- [ ] Commit and push to GitHub

### During Deployment
- [ ] Set all environment variables
- [ ] Configure database connection
- [ ] Run database migrations
- [ ] Verify build succeeds
- [ ] Check deployment logs

### After Deployment
- [ ] Run health check
- [ ] Test admin login
- [ ] Test API endpoints
- [ ] Set up monitoring
- [ ] Configure alerts

## 🚨 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
npm run clean
npm install
npm run build
```

### Database Connection Error
- Verify `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Check database is running
- Verify network connectivity

### Health Check Fails
```bash
# Check logs
# Railway/Render: Dashboard logs
# Docker: docker-compose logs api
# PM2: pm2 logs shambit-api

# Verify environment variables
# Check database connection
# Ensure migrations ran successfully
```

### CORS Errors
- Update `CORS_ORIGIN` with your frontend domain
- Remove wildcard `*` in production
- Include protocol: `https://yourdomain.com`

## 📞 Support

### Documentation
- `PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Complete checklist
- `PRODUCTION_READINESS_SUMMARY.md` - Readiness assessment
- `README.md` - General documentation

### Platform Support
- Railway: [docs.railway.app](https://docs.railway.app)
- Render: [render.com/docs](https://render.com/docs)
- Docker: [docs.docker.com](https://docs.docker.com)

### Security Audit
```bash
npm run security:audit
```

### Health Check
```bash
npm run health:check https://your-api-url.com
```

## 🎉 Success!

Your ShamBit platform is now live in production!

**Next Steps:**
1. Monitor logs for first 24 hours
2. Test all critical features
3. Set up automated backups
4. Configure error tracking (Sentry)
5. Review performance metrics

---

**Deployment Time:** 15-30 minutes  
**Status:** ✅ Production Ready  
**Support:** See documentation files
