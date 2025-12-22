# SMS Setup Guide

## Quick Start (Testing Without API Key)

Your SMS service is already configured for testing! All SMS messages will be logged to the console.

### Current Configuration (in `.env` file)

```env
SMS_PROVIDER=fast2sms
SMS_SENDER_ID=SHAMBIT
# FAST2SMS_API_KEY=your_fast2sms_api_key_here  (commented out for testing)
```

### What Happens Now?

✅ **All SMS messages are logged to console**
✅ **No errors thrown** - your app works normally
✅ **You can see OTP codes in console** for testing
✅ **No API calls made** - no charges

### Console Output Example

When you trigger an OTP, you'll see:

```
📱 SMS MESSAGE (Fast2SMS)
========================
To: +919876543210
Message: Your ShamBit registration OTP is: 123456. Valid for 5 minutes. Do not share this OTP with anyone. - ShamBit
Sender ID: SHAMBIT
Timestamp: 2024-12-22T10:30:00.000Z
========================
⚠️  Fast2SMS API key not configured - SMS logged only
```

---

## Production Setup (When You Get API Key)

### Step 1: Get Fast2SMS API Key

1. Go to [Fast2SMS](https://www.fast2sms.com/)
2. Sign up / Login
3. Go to **Dashboard** → **API Keys**
4. Copy your API key

### Step 2: Add API Key to `.env`

Open your `.env` file and uncomment the API key line:

```env
SMS_PROVIDER=fast2sms
SMS_SENDER_ID=SHAMBIT
FAST2SMS_API_KEY=your_actual_api_key_here  # Remove the # and add your key
```

### Step 3: Restart Your Server

```bash
npm run dev
```

That's it! SMS will now be sent via Fast2SMS API.

---

## Testing Your Setup

### Test OTP Generation

```javascript
// In your code or API endpoint
const result = await otpService.generateAndSendOTP('9876543210', 'registration');
console.log(result);
```

### Check Console Output

- **Without API key**: See formatted SMS message in console
- **With API key**: See SMS message + "✅ SMS sent successfully via Fast2SMS"

---

## Alternative SMS Providers

If you want to use a different provider, update `.env`:

### TextLocal
```env
SMS_PROVIDER=textlocal
SMS_API_KEY=your_textlocal_api_key
SMS_API_URL=https://api.textlocal.in/send/
SMS_SENDER_ID=SHAMBIT
```

### Twilio
```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### AWS SNS
```env
SMS_PROVIDER=aws_sns
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
SMS_SENDER_ID=SHAMBIT
```

---

## Troubleshooting

### SMS not showing in console?

1. Check `SMS_PROVIDER=fast2sms` is set in `.env`
2. Restart your server
3. Check console for any errors

### SMS not sending even with API key?

1. Verify API key is correct (no extra spaces)
2. Check Fast2SMS dashboard for credits
3. Check console for error messages
4. Verify phone number format (10 digits, starting with 6-9)

### Want to test without console logs?

Set `NODE_ENV=production` in `.env` (but keep API key commented for testing)

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMS_PROVIDER` | Yes | - | Provider name: `fast2sms`, `textlocal`, `twilio`, `aws_sns` |
| `SMS_SENDER_ID` | No | `SHAMBIT` | Sender ID shown in SMS |
| `FAST2SMS_API_KEY` | No* | - | Fast2SMS API key (*required for production) |
| `NODE_ENV` | No | `development` | Environment mode |

---

## Need Help?

- Fast2SMS Documentation: https://docs.fast2sms.com/
- Check console logs for detailed error messages
- Verify phone number format: 10 digits, starting with 6-9
