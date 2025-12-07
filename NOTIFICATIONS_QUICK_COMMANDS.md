# Notifications - Quick Command Reference

## 🚀 Quick Start (3 Commands)

```bash
# 1. Seed test notifications (replace with actual user mobile number)
cd services/api && npx ts-node scripts/seed-test-notifications.ts +919876543210

# 2. Install mobile app
cd mobile_app && adb install app/build/outputs/apk/debug/app-debug.apk

# 3. Open app → Profile → Notifications → Done! 🎉
```

---

## 📱 Mobile App Commands

### Build APK
```bash
cd mobile_app
./gradlew assembleDebug
```

### Install APK
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Clean Build
```bash
./gradlew clean
./gradlew assembleDebug
```

### Check Diagnostics
```bash
./gradlew lint
```

---

## 🔧 Backend Commands

### Seed Test Notifications
```bash
cd services/api
npx ts-node scripts/seed-test-notifications.ts +919876543210
```

### Start Backend Server
```bash
cd services/api
npm run dev
```

### Run Database Migrations
```bash
cd packages/database
npm run migrate:latest
```

### Check Database
```bash
psql -U postgres -d shambit_db
```

---

## 🧪 API Testing Commands

### Get Notifications
```bash
curl -X GET "http://localhost:3000/api/v1/notifications/history?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Register Device Token
```bash
curl -X POST "http://localhost:3000/api/v1/notifications/device-token" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "fcm_token_here",
    "platform": "android"
  }'
```

### Send Test Notification
```bash
curl -X POST "http://localhost:3000/api/v1/notifications/test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Preferences
```bash
curl -X GET "http://localhost:3000/api/v1/notifications/preferences" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Preferences
```bash
curl -X PUT "http://localhost:3000/api/v1/notifications/preferences" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pushEnabled": true,
    "smsEnabled": false,
    "emailEnabled": true,
    "promotionalEnabled": false
  }'
```

---

## 📊 Database Queries

### View All Notifications
```sql
SELECT * FROM notification_history ORDER BY created_at DESC LIMIT 10;
```

### View User Notifications
```sql
SELECT * FROM notification_history 
WHERE user_id = 'user-id' 
ORDER BY created_at DESC;
```

### Count by Type
```sql
SELECT type, COUNT(*) as count 
FROM notification_history 
GROUP BY type 
ORDER BY count DESC;
```

### Failed Notifications
```sql
SELECT * FROM notification_history 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

### Active Device Tokens
```sql
SELECT * FROM device_tokens WHERE is_active = true;
```

### User Preferences
```sql
SELECT * FROM notification_preferences WHERE user_id = 'user-id';
```

### Delete Test Notifications
```sql
DELETE FROM notification_history WHERE user_id = 'user-id';
```

---

## 🔍 Debugging Commands

### Check Backend Health
```bash
curl http://localhost:3000/health
```

### Check Mobile App Logs
```bash
adb logcat | grep -i notification
```

### Check Backend Logs
```bash
cd services/api
tail -f logs/app.log
```

### Check Database Connection
```bash
psql -U postgres -d shambit_db -c "SELECT COUNT(*) FROM notification_history;"
```

---

## 📦 File Locations

### Mobile App
```
mobile_app/app/build/outputs/apk/debug/app-debug.apk
```

### Backend Seed Script
```
services/api/scripts/seed-test-notifications.ts
```

### Backend Service
```
services/api/src/services/notification.service.ts
```

### Backend Routes
```
services/api/src/routes/notification.routes.ts
```

### Database Migration
```
packages/database/src/migrations/20251024000009_create_notifications_tables.ts
```

---

## 🎯 Common Tasks

### Task: Test notifications immediately
```bash
# 1. Seed data
cd services/api
npx ts-node scripts/seed-test-notifications.ts +919876543210

# 2. Open app and check
```

### Task: Clear all notifications for a user
```sql
DELETE FROM notification_history WHERE user_id = 'user-id';
```

### Task: Rebuild mobile app
```bash
cd mobile_app
./gradlew clean assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Task: Check notification stats
```sql
SELECT 
  type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM notification_history
GROUP BY type;
```

### Task: Find user by mobile number
```sql
SELECT id, name, mobile_number FROM users WHERE mobile_number = '+919876543210';
```

---

## 🚨 Emergency Commands

### Backend not responding
```bash
# Restart backend
cd services/api
npm run dev
```

### Mobile app crashes
```bash
# Check logs
adb logcat | grep -E "AndroidRuntime|FATAL"

# Reinstall app
adb uninstall com.shambit.customer
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Database issues
```bash
# Check connection
psql -U postgres -d shambit_db -c "SELECT 1;"

# Run migrations
cd packages/database
npm run migrate:latest
```

---

## 📝 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/shambit_db

# Firebase (Optional)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# SMS
SMS_API_KEY=your-sms-api-key
SMS_SENDER_ID=SHAMBT
```

### Mobile App (.env)
```env
API_BASE_URL=http://10.0.2.2:3000/api/v1
```

---

## ✅ Verification Checklist

```bash
# 1. Backend running?
curl http://localhost:3000/health

# 2. Database tables exist?
psql -U postgres -d shambit_db -c "\dt notification*"

# 3. Test data seeded?
psql -U postgres -d shambit_db -c "SELECT COUNT(*) FROM notification_history;"

# 4. Mobile app installed?
adb shell pm list packages | grep shambit

# 5. API accessible from mobile?
curl http://10.0.2.2:3000/health
```

---

## 🎉 Success Indicators

✅ Seed script runs without errors  
✅ Backend returns 200 OK for /health  
✅ Database has notification_history table  
✅ Mobile app installs successfully  
✅ Notifications appear in mobile app  
✅ Swipe to delete works  
✅ Mark all as read works  
✅ Pagination works  

---

**Quick Reference Card**  
**Version:** 1.0  
**Last Updated:** December 5, 2024
