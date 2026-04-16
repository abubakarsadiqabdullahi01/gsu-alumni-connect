# ✅ Setup Complete: Monitor Worker on Vercel

## What Was Added

### 1. New Monitoring Scripts

**`scripts/monitor-vercel-jobs.ts`**
- Polls job status via Vercel API
- Shows real-time progress, stats, and completion

**`scripts/check-redis-queue.ts`**
- Checks Redis queue for active/waiting/completed/failed jobs
- Helps diagnose queue issues

### 2. New npm Commands

```bash
# Monitor specific job on Vercel
pnpm import:monitor-vercel <JOB_ID> [VERCEL_URL]
pnpm import:monitor-vercel f8acb5a7-a1e6-45a0-a15e-6c28d9fdf44d

# Check Redis queue status
pnpm queue:check

# Run worker locally (existing)
pnpm worker:import
```

### 3. New Documentation

- `docs/MONITOR_VERCEL_JOBS.md` - Complete monitoring guide
- `docs/QUICK_VERCEL_MONITORING.md` - Quick reference
- `docs/WORKER_DEPLOYMENT.md` - Deploy worker to production
- `Procfile` - For Railway/Render deployment

---

## How to Use

### Scenario 1: Upload on Vercel, Monitor from Local

```bash
# 1. Upload file on https://gsu-alumni-connect.vercel.app/admin/uploads
#    → Copy JOB_ID from response or URL

# 2. Monitor from local terminal
pnpm import:monitor-vercel <JOB_ID>

# 3. Output shows:
#    ✅ Progress: 450/1108 (40.6%)
#    📊 Created: 200, Updated: 250, Failed: 0
```

### Scenario 2: Check Worker Status

```bash
# See what's happening in Redis queue
pnpm queue:check

# Output:
# 🟢 Active:    1 job(s)
# ⏳ Waiting:    2 job(s)
# ✅ Completed: 45 job(s)
```

### Scenario 3: Run Worker on Production

**Option A: Keep Running Locally**
```bash
pnpm worker:import
# Processes jobs queued from Vercel
```

**Option B: Deploy to Railway** (Recommended)
```bash
npm i -g @railway/cli
railway login
railway init
railway up

# View logs:
railway logs
```

**Option C: Deploy to Render**
- Go to https://render.com
- Connect repo
- Start Command: `pnpm worker:import`
- Set ENV vars
- Deploy

---

## Architecture Explanation

```
┌────────────────────────────────────┐
│  VERCEL (API)                      │
│  - Receives upload                 │
│  - Queues job to Redis             │
│  - Returns JOB_ID                  │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│  REDIS (Upstash)                   │
│  - Stores job queue                │
│  - Accessible from anywhere        │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│  WORKER (Local/Railway/Render)     │
│  - Polls Redis for jobs            │
│  - Processes imports               │
│  - Updates progress                │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│  API Status Endpoint               │
│  - GET /api/import-jobs/{id}       │
│  - Shows job progress              │
│  - Used for monitoring             │
└────────────────────────────────────┘
```

---

## Key Points to Remember

✅ **Vercel**: Handles API requests (can't run long-term tasks)  
✅ **Redis**: Central queue connecting Vercel and Worker  
✅ **Worker**: Must run separately (Local/Railway/Render)  
✅ **Monitoring**: Works from anywhere via API or Redis  

❌ **Don't**: Try to run worker on Vercel (5-min timeout)  
❌ **Don't**: Queue more than 1000 rows without testing  
✅ **Do**: Keep worker running during imports  
✅ **Do**: Monitor progress via `pnpm import:monitor-vercel`  

---

## Troubleshooting

### Job shows "processing" but no progress?
```bash
# Check if worker is running
pnpm queue:check

# If no active jobs, worker crashed
# Restart worker:
pnpm worker:import
```

### Redis connection error?
```bash
# Verify credentials in .env.local
cat .env.local | grep UPSTASH_REDIS

# Test connection
pnpm queue:check
```

### Job stuck for hours?
```bash
# Check worker logs
# Local: check terminal running pnpm worker:import
# Railway: railway logs
# Render: Render Dashboard → Logs

# If worker crashed, see error details
# May need to restart with:
pnpm worker:import
```

---

## Next Steps

1. **Test locally first**
   ```bash
   pnpm dev              # Terminal 1
   pnpm worker:import    # Terminal 2
   # Upload test file on http://localhost:3000/admin/uploads
   ```

2. **Deploy when confident**
   - Deploy API to Vercel (already done)
   - Deploy Worker to Railway/Render
   - Keep monitoring setup

3. **Monitor in production**
   ```bash
   pnpm import:monitor-vercel JOB_ID https://gsu-alumni-connect.vercel.app
   ```

---

## Files Modified/Created

- ✅ `package.json` - Added 2 new scripts
- ✅ `scripts/monitor-vercel-jobs.ts` - New monitoring script
- ✅ `scripts/check-redis-queue.ts` - New queue checker
- ✅ `Procfile` - For production deployment
- ✅ `docs/MONITOR_VERCEL_JOBS.md` - Full guide
- ✅ `docs/QUICK_VERCEL_MONITORING.md` - Quick reference
- ✅ `docs/WORKER_DEPLOYMENT.md` - Deployment guide

Ready to deploy! 🚀
