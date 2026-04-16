# Monitoring Import Jobs on Vercel

## Quick Summary

**Vercel** = API & UI (request → queue job)  
**Worker** = Background processor (must run separately)  
**Redis** = Message queue (connects both)

---

## Method 1: Monitor via API (Recommended for Vercel)

### Check Job Status from Command Line
```bash
# With production URL
pnpm import:monitor-vercel <JOB_ID> https://gsu-alumni-connect.vercel.app

# Example
pnpm import:monitor-vercel f8acb5a7-a1e6-45a0-a15e-6c28d9fdf44d
```

Output will show:
```
📡 Polling: https://gsu-alumni-connect.vercel.app/api/import-jobs/f8acb5a7...

[4:30:15 PM] 📊 Job Status: processing
   Progress: 450/1108 (40.6%)
   Stats:
     - Created: 200
     - Updated: 250
     - Failed: 0
     - Parse Warnings: 0

[4:30:20 PM] 📊 Job Status: processing
   Progress: 500/1108 (45.1%)
   ...
```

### Check via API Directly
```bash
curl "https://gsu-alumni-connect.vercel.app/api/import-jobs/JOB_ID"
```

Response:
```json
{
  "job": {
    "id": "f8acb5a7-a1e6-45a0-a15e-6c28d9fdf44d",
    "status": "processing",
    "progress": { "processed": 500, "total": 1108 },
    "stats": { "created": 200, "updated": 250, "failed": 0 },
    "createdAt": "2026-04-16T12:00:00Z"
  }
}
```

---

## Method 2: Check Redis Queue Status

```bash
pnpm queue:check
```

Output:
```
📊 Import Queue Status

📈 Queue Overview:
   🟢 Active:    1 job(s)
   ⏳ Waiting:    3 job(s)
   ✅ Completed: 45 job(s)
   ❌ Failed:    0 job(s)

🟢 Active Jobs:
   - f8acb5a7-a1e6-45a0-a15e-6c28d9fdf44d
```

---

## Method 3: Keep Worker Running Separately

### Option A: Local Machine (Development)
```bash
# Terminal 1: Start Vercel API
pnpm dev

# Terminal 2: Start Worker
pnpm worker:import
```

The worker will continuously poll Redis and process jobs from both local and Vercel uploads.

**Output:**
```
[import-worker] ready (queue=import-jobs, concurrency=1)
[import-worker] Checkpoint: 100/1108 processed (45 created, 55 updated, 0 failed)
[import-worker] job f8acb5a7... finished with 1108/1108 processed
```

### Option B: Deploy Worker to Railway

1. Go to https://railway.app
2. Click "Create Project" → "Deploy from GitHub"
3. Select your repo
4. Set Environment Variables:
   - `DATABASE_URL` (from Neon)
   - `REDIS_URL` (if using Upstash)
   - Other env vars from `.env.local`
5. Set Start Command: `pnpm worker:import`
6. Deploy

**View logs:**
```bash
railway login
railway logs
```

### Option C: Deploy Worker to Render

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repo
4. Set Build Command: `pnpm install && pnpm prisma generate`
5. Set Start Command: `pnpm worker:import`
6. Add Environment Variables
7. Deploy (Free tier includes auto-sleep)

**View logs:** Check Render Dashboard "Logs" tab

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL (Edge)                        │
│                                                              │
│  UI: /admin/uploads (Upload File)                           │
│        ↓                                                     │
│  API: POST /api/upload/import-file                          │
│        ↓                                                     │
│  API: POST /api/import-jobs (Queue Job to Redis)            │
│        ↓                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          REDIS (Upstash Cloud)                      │   │
│  │  import-jobs:wait    [job-1, job-2, job-3]         │   │
│  │  import-jobs:active  [job-4]                        │   │
│  │  import-jobs:completed [job-5, ...]                │   │
│  └─────────────────────────────────────────────────────┘   │
│        ↑                                                     │
│        │                                                     │
│  API: GET /api/import-jobs/:id (Check Status)              │
│        ↑                                                     │
└─────────────────────────────────────────────────────────────┘
         │
         │ (Remote Check)
         │
    ┌────────────────────────────────────┐
    │  YOUR MACHINE / RAILWAY / RENDER   │
    │                                    │
    │  Worker: pnpm worker:import        │
    │  - Polls Redis Queue               │
    │  - Processes Jobs                  │
    │  - Updates Progress in Redis       │
    │                                    │
    └────────────────────────────────────┘
```

---

## Troubleshooting

### Job Stuck in "Processing"
```bash
# Check if worker is still running
pnpm queue:check

# If no active jobs but status says processing:
# - Check worker logs (Railway/Render/Local)
# - May have crashed mid-processing
```

### Job Not Starting
```bash
# Check if it's in waiting queue
pnpm queue:check

# Make sure worker is running
pnpm worker:import  # Start if stopped
```

### Redis Connection Issues
```bash
# Verify Redis credentials in .env.local
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Test connection
pnpm queue:check
```

---

## Summary Table

| Scenario | Action | Command |
|----------|--------|---------|
| **Monitor job on Vercel** | Poll API | `pnpm import:monitor-vercel <ID>` |
| **Check queue status** | Check Redis | `pnpm queue:check` |
| **Run worker locally** | Process jobs | `pnpm worker:import` |
| **Deploy worker** | To Railway/Render | See deployment guide |
| **View Vercel logs** | Import history | https://gsu-alumni-connect.vercel.app/admin/uploads |
