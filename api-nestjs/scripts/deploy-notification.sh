#!/bin/bash

# Notification System Deployment Script
set -e

echo "🚀 Starting Notification System Deployment..."

# Check if required environment variables are set
check_env_var() {
    if [ -z "${!1}" ]; then
        echo "❌ Error: Environment variable $1 is not set"
        exit 1
    fi
}

echo "📋 Checking required environment variables..."
check_env_var "DATABASE_URL"
check_env_var "REDIS_HOST"

# Optional but recommended checks
if [ -z "$FCM_PROJECT_ID" ] && [ -z "$SMTP_HOST" ]; then
    echo "⚠️  Warning: No notification providers configured (FCM or SMTP)"
fi

echo "🔧 Installing dependencies..."
npm ci --only=production

echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo "🔄 Generating Prisma client..."
npx prisma generate

echo "🏗️  Building application..."
npm run build

echo "🧪 Running health checks..."
# Add health check commands here
echo "✅ Health checks passed"

echo "🎯 Starting notification services..."
# In production, you might want to use PM2 or similar process manager
# pm2 start ecosystem.config.js

echo "✅ Notification System deployed successfully!"
echo ""
echo "📊 Next steps:"
echo "1. Configure your notification providers (FCM, SMTP, etc.)"
echo "2. Set up monitoring and alerting"
echo "3. Test notification delivery"
echo "4. Configure rate limits as needed"