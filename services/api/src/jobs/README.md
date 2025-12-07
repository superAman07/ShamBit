# Scheduled Jobs

This directory contains background jobs that should be run on a schedule to maintain system health and performance.

## Available Jobs

### 1. Cleanup Reservations (`cleanup-reservations.ts`)

**Purpose**: Clean up expired inventory reservations

**Schedule**: Every 5 minutes

**Description**: Removes inventory reservations that have expired (older than 10 minutes) and releases the reserved stock back to available inventory. This is an essential job that prevents inventory from being stuck in a reserved state.

**Setup**:
```bash
# Cron expression: */5 * * * *
*/5 * * * * cd /path/to/services/api && node dist/jobs/cleanup-reservations.js
```

---

## Setup Instructions

### Local Development

For local testing, you can run the job manually:

```bash
cd services/api

# Run cleanup reservations
ts-node src/jobs/cleanup-reservations.ts
```

### Production Setup

#### Option 1: Cron (Linux/Unix)

1. Build the project:
```bash
cd services/api
npm run build
```

2. Edit crontab:
```bash
crontab -e
```

3. Add job schedule:
```bash
# Cleanup expired reservations every 5 minutes
*/5 * * * * cd /path/to/services/api && node dist/jobs/cleanup-reservations.js >> /var/log/shambit/cleanup-reservations.log 2>&1
```

#### Option 2: Railway/Render Cron Jobs

Both Railway and Render support cron jobs natively:

**Railway:**
1. Add a cron service in `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/jobs/cleanup-reservations.js",
    "restartPolicyType": "ON_FAILURE",
    "cronSchedule": "*/5 * * * *"
  }
}
```

**Render:**
1. Create a Cron Job in the Render dashboard
2. Set schedule: `*/5 * * * *`
3. Set command: `node dist/jobs/cleanup-reservations.js`

#### Option 3: Cloud Schedulers

##### AWS EventBridge

1. Create Lambda function for the cleanup job
2. Set up EventBridge rule with cron expression: `*/5 * * * *`
3. Configure Lambda to run the job code

##### Google Cloud Scheduler

1. Create Cloud Function for the cleanup job
2. Set up Cloud Scheduler job with schedule: `*/5 * * * *`
3. Configure HTTP trigger

##### Azure Logic Apps

1. Create Logic App for the cleanup job
2. Set up recurrence trigger: every 5 minutes
3. Configure HTTP action to run job

---

## Monitoring

### Logs

The cleanup job uses structured logging. Check logs for:
- Job start/completion
- Number of reservations cleaned up
- Errors and failures

Example log output:
```json
{
  "timestamp": "2025-11-14T01:00:00.000Z",
  "level": "INFO",
  "service": "cleanup-reservations-job",
  "message": "Cleanup job completed",
  "cleanedCount": 3
}
```

### Alerts

Set up alerts for:
- Job failures (exit code != 0)
- High number of expired reservations (may indicate checkout issues)

### Health Checks

Monitor job execution:
```bash
# Check last run time
ls -lt /var/log/shambit/cleanup-reservations.log

# Check for errors
grep ERROR /var/log/shambit/cleanup-reservations.log

# Check recent activity
tail -f /var/log/shambit/cleanup-reservations.log
```

---

## Troubleshooting

### Job Not Running

1. Check cron service is running (if using cron):
```bash
systemctl status cron
```

2. Check crontab syntax:
```bash
crontab -l
```

3. Check file permissions:
```bash
ls -l dist/jobs/cleanup-reservations.js
```

4. For Railway/Render, check the cron job logs in the dashboard

### Job Failing

1. Check logs for errors:
```bash
tail -f /var/log/shambit/cleanup-reservations.log
```

2. Run manually to see errors:
```bash
cd services/api
node dist/jobs/cleanup-reservations.js
```

3. Check database connectivity:
```bash
# Test database connection
psql -h $DATABASE_URL
```

### Performance Issues

1. Check database query performance for reservation queries
2. Monitor if large numbers of reservations are expiring (may indicate checkout flow issues)
3. The job should complete quickly (< 1 second for typical loads)

---

## Best Practices

1. **Idempotency**: The cleanup job is safe to run multiple times
2. **Error Handling**: Errors are caught and logged per reservation
3. **Monitoring**: Set up alerts for job failures
4. **Logging**: Uses structured logging for easy debugging
5. **Testing**: Test in staging before production
6. **Frequency**: Running every 5 minutes ensures reservations don't stay locked for long

---

## Why This Job is Essential

The cleanup-reservations job is critical for the inventory system:

- **Prevents Stock Lockup**: Without this job, failed checkouts would leave inventory permanently reserved
- **Improves Availability**: Releases stock back to available pool quickly
- **User Experience**: Ensures other customers can purchase items from abandoned carts
- **System Health**: Prevents the reserved_stock from growing indefinitely

**Do not remove this job** - it's a core part of the inventory reservation system.
