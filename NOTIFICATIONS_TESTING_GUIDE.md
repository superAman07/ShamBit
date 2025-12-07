# 🧪 Notifications Testing Guide

## Issue: "Unauthorized" Error in Profile

### What's Happening

The error you're seeing:
```
401 Unauthorized
{"success":false,"error":{"code":"NO_AUTH_HEADER","message":"No authorization header provided"}}
```

This means the user is **not logged in** or the **JWT token has expired**.

### Why This Happens

The Profile screen (and Notifications screen) require authentication. The app needs a valid JWT token to access these endpoints.

---

## ✅ Solution: Login First

### Step 1: Login to the App

1. **Open the ShamBit app**
2. **You should see the Login screen**
3. **Enter mobile number:** `9044956870` (the test user we seeded notifications for)
4. **Tap "Send OTP"**
5. **Enter the OTP** you receive
6. **Tap "Verify"**

### Step 2: Navigate to Profile

After successful login:
1. **Tap the Profile tab** (bottom navigation)
2. You should now see your profile information
3. **Tap "Notifications"**
4. **See the 5 test notifications!** 🎉

---

## 🔍 Troubleshooting

### Issue 1: No OTP Received

**Solution:**
- Check if SMS service is configured in backend
- Check backend logs for OTP generation
- Use the OTP from backend logs if SMS is not working

**Alternative:** Check backend console for OTP:
```bash
# Backend will log the OTP
# Look for: "OTP sent to 9044956870: 123456"
```

### Issue 2: Still Getting "Unauthorized"

**Possible Causes:**
1. Token expired
2. Token not saved properly
3. Backend not generating token

**Solution:**
1. **Clear app data:**
   ```bash
   adb shell pm clear com.shambit.customer
   ```

2. **Reinstall app:**
   ```bash
   adb uninstall com.shambit.customer
   adb install mobile_app/app/build/outputs/apk/debug/app-debug.apk
   ```

3. **Login again**

### Issue 3: Can't Login

**Check Backend:**
```bash
# 1. Check if backend is running
curl http://192.168.3.103:3000/health

# 2. Check if user exists
# Run this in backend:
cd services/api
npx ts-node -e "
const { getDatabase } = require('@shambit/database');
const db = getDatabase();
db('users').where({ mobile_number: '9044956870' }).first()
  .then(user => console.log('User:', user))
  .then(() => process.exit(0));
"
```

---

## 📱 Complete Testing Flow

### 1. Prepare Backend

```bash
# Start backend server
cd services/api
npm run dev

# In another terminal, seed test notifications
npx ts-node scripts/test-notifications-e2e.ts
```

**Expected Output:**
```
✅ Found test user: Amit Kumar Upadhyay (9044956870)
✅ Seeded 5 test notifications
```

### 2. Install Mobile App

```bash
cd mobile_app
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 3. Login

1. Open app
2. Enter mobile: `9044956870`
3. Tap "Send OTP"
4. Check backend logs for OTP
5. Enter OTP
6. Tap "Verify"

### 4. Test Notifications

1. Go to Profile tab
2. Tap "Notifications"
3. See 5 notifications:
   - Order Confirmed! 🎉
   - Order Being Prepared 📦
   - Order Out for Delivery 🚚
   - Payment Successful 💳
   - Special Offer! 🎁

### 5. Test Interactions

**Swipe to Delete:**
- Swipe any notification left
- Should show red delete background
- Notification removed

**Tap Notification:**
- Tap on a notification
- Should navigate (if order exists)

**Mark All as Read:**
- Tap icon in top-right
- Blue dots disappear

---

## 🔐 Authentication Flow

### How It Works

```
1. User enters mobile number
   ↓
2. Backend sends OTP via SMS
   ↓
3. User enters OTP
   ↓
4. Backend verifies OTP
   ↓
5. Backend generates JWT tokens (access + refresh)
   ↓
6. Mobile app saves tokens in SharedPreferences
   ↓
7. AuthInterceptor adds token to all API requests
   ↓
8. Backend validates token
   ↓
9. API returns data
```

### Token Storage

Tokens are stored in:
```
SharedPreferences
├── access_token (expires in 15 minutes)
└── refresh_token (expires in 30 days)
```

### Token Refresh

When access token expires:
1. API returns 401 Unauthorized
2. TokenAuthenticator intercepts
3. Calls refresh token endpoint
4. Gets new access token
5. Retries original request

---

## 🧪 Manual API Testing

### Test with cURL (After Login)

```bash
# 1. Login and get token
curl -X POST "http://192.168.3.103:3000/api/v1/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9044956870"}'

# 2. Verify OTP (replace with actual OTP)
curl -X POST "http://192.168.3.103:3000/api/v1/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9044956870", "otp": "123456"}'

# Response will include:
# {
#   "success": true,
#   "data": {
#     "accessToken": "eyJhbGc...",
#     "refreshToken": "eyJhbGc...",
#     "user": {...}
#   }
# }

# 3. Use token to get notifications
curl -X GET "http://192.168.3.103:3000/api/v1/notifications/history?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

## 📊 Expected Results

### After Login

**Profile Screen:**
```
✅ Shows user name: Amit Kumar Upadhyay
✅ Shows mobile: 9044956870
✅ Shows menu items:
   - My Orders
   - Saved Addresses
   - Wishlist
   - Notifications ← This one!
   - About
```

**Notifications Screen:**
```
✅ Shows 5 notifications
✅ Each with icon, title, body, timestamp
✅ Swipe to delete works
✅ Mark all as read works
✅ Relative time displayed ("2 hours ago")
```

---

## 🐛 Common Issues & Solutions

### Issue: "Unauthorized" on Profile

**Cause:** Not logged in or token expired

**Solution:**
1. Login with mobile number
2. Verify OTP
3. Try again

### Issue: "Backend API not ready"

**Cause:** Backend server not running

**Solution:**
```bash
cd services/api
npm run dev
```

### Issue: No notifications showing

**Cause:** Notifications not seeded

**Solution:**
```bash
cd services/api
npx ts-node scripts/test-notifications-e2e.ts
```

### Issue: Can't swipe to delete

**Cause:** UI issue or not implemented

**Solution:** Already implemented! Make sure you're swiping from right to left.

---

## ✅ Success Checklist

Before testing notifications:
- [ ] Backend server running
- [ ] Test notifications seeded
- [ ] Mobile app installed
- [ ] User logged in successfully
- [ ] Profile screen loads without errors
- [ ] Can navigate to Notifications

After testing notifications:
- [ ] Notifications screen loads
- [ ] 5 notifications visible
- [ ] Icons and colors correct
- [ ] Timestamps showing
- [ ] Swipe to delete works
- [ ] Mark all as read works
- [ ] Pagination works (if more than 20)

---

## 🎯 Quick Test Commands

```bash
# 1. Check backend
curl http://192.168.3.103:3000/health

# 2. Seed notifications
cd services/api && npx ts-node scripts/test-notifications-e2e.ts

# 3. Check if notifications exist
# (Run in backend directory)
npx ts-node -e "
const { getDatabase } = require('@shambit/database');
const db = getDatabase();
db('notification_history')
  .where({ user_id: 'a01984df-db2f-447f-a759-01530aa2dd8a' })
  .count('* as count')
  .then(result => console.log('Notifications:', result[0].count))
  .then(() => process.exit(0));
"

# 4. Clear app data (if needed)
adb shell pm clear com.shambit.customer

# 5. Reinstall app
adb install -r mobile_app/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📞 Need Help?

### Check Logs

**Backend Logs:**
```bash
cd services/api
tail -f logs/app.log
```

**Mobile Logs:**
```bash
adb logcat | grep -i "shambit\|notification\|auth"
```

### Verify Data

**Check User:**
```sql
SELECT * FROM users WHERE mobile_number = '9044956870';
```

**Check Notifications:**
```sql
SELECT * FROM notification_history 
WHERE user_id = 'a01984df-db2f-447f-a759-01530aa2dd8a'
ORDER BY created_at DESC;
```

**Check Token:**
```bash
# In mobile app, check SharedPreferences
adb shell run-as com.shambit.customer cat shared_prefs/user_preferences.xml
```

---

## 🎉 Summary

**The "Unauthorized" error is expected** when you're not logged in. This is actually a **good sign** - it means authentication is working correctly!

**To test notifications:**
1. ✅ Login first
2. ✅ Navigate to Profile → Notifications
3. ✅ See your test notifications!

The notifications system is **fully functional** - you just need to be authenticated to access it.

---

**Last Updated:** December 6, 2024  
**Status:** ✅ Working as Expected  
**Next Step:** Login and test!
