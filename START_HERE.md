# 🎯 Quick Start: Monitor Worker on Vercel

## TL;DR

```bash
# 1. Keep worker running
pnpm worker:import

# 2. Upload file on Vercel
# https://gsu-alumni-connect.vercel.app/admin/uploads
# → Copy JOB_ID

# 3. Monitor from local
pnpm import:monitor-vercel <JOB_ID>
```

---

## The 3 New Commands

### 1️⃣ Monitor Job on Vercel
```bash
pnpm import:monitor-vercel f8acb5a7-a1e6-45a0-a15e-6c28d9fdf44d
```
**Shows:** Real-time progress, created/updated count, status  
**Best for:** Tracking ongoing imports

---

### 2️⃣ Check Redis Queue
```bash
pnpm queue:check
```
**Shows:** Active/waiting/completed/failed jobs  
**Best for:** Debugging queue issues

---

### 3️⃣ Run Worker (Existing)
```bash
pnpm worker:import
```
**Does:** Processes jobs from Redis queue  
**Must:** Keep running while Vercel has uploads

---

## Architecture (3-Layer)

```
Layer 1: VERCEL (Serverless API)
├─ Receives upload
├─ Queues to Redis
└─ Returns JOB_ID

         ↓

Layer 2: REDIS (Message Queue)
├─ Stores jobs
└─ Accessible from anywhere

         ↓

Layer 3: WORKER (Background Processor)
├─ Polls Redis for jobs
├─ Processes imports
└─ Updates progress
```

---

## Common Tasks

### Task 1: Upload & Monitor
```bash
# Terminal 1: Start worker
pnpm worker:import

# Terminal 2: Open browser
# https://gsu-alumni-connect.vercel.app/admin/uploads
# Upload file → Copy JOB_ID

# Terminal 3: Monitor
pnpm import:monitor-vercel JOB_ID
```

### Task 2: Check Queue Status
```bash
pnpm queue:check

# Shows:
# 🟢 Active: 1 job
# ⏳ Waiting: 2 jobs
# ✅ Completed: 45 jobs
```

### Task 3: Deploy Worker to Production
```bash
# Option A: Railway
npm i -g @railway/cli
railway login
railway up

# Option B: Render (https://render.com)
# - Connect GitHub
# - Start: pnpm worker:import
# - Deploy
```

---

## Files You Got

| File | Purpose |
|------|---------|
| `scripts/monitor-vercel-jobs.ts` | Poll job status via API |
| `scripts/check-redis-queue.ts` | Check Redis queue |
| `docs/MONITOR_VERCEL_JOBS.md` | Full documentation |
| `docs/QUICK_VERCEL_MONITORING.md` | Quick reference |
| `docs/WORKER_DEPLOYMENT.md` | Production deployment |
| `Procfile` | For Railway/Render |

---

## Key Insights

❌ **Vercel can't run long tasks** (5-min timeout)  
✅ **But Vercel can queue jobs** (to Redis)  
✅ **Worker runs elsewhere** (Local/Railway/Render)  
✅ **Status visible from anywhere** (API endpoint)  

---

## Flow Diagram

```
┌─────────────────────────────────────────────┐
│  Browser                                    │
│  Upload: https://gsu-alumni-connect...     │
└─────────────────────┬───────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────┐
│  Vercel API                                 │
│  POST /api/import-jobs → Queue to Redis     │
│  Returns: JOB_ID                            │
└─────────────────────┬───────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────┐
│  Redis (Upstash)                            │
│  import-jobs:wait [job-123, ...]            │
└─────────────────────┬───────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      ↓               ↓               ↓
  Local PC         Railway         Render
  Worker         Worker          Worker
  Processes      Processes       Processes
                      │
                      ↓
            Status API: GET /api/import-jobs/:id
                      │
        ┌─────────────┴──────────────┐
        ↓                            ↓
    Terminal:              Browser Admin:
    pnpm import:           /admin/uploads
    monitor-vercel         Shows status
```

---

## Next: Deploy Worker

**Right now**: Worker on local machine works fine  
**For production**: Deploy to Railway (10 min setup)

See `docs/WORKER_DEPLOYMENT.md` for details

---

## Still Have Questions?

- 📖 Full guide: `docs/MONITOR_VERCEL_JOBS.md`
- ⚡ Quick ref: `docs/QUICK_VERCEL_MONITORING.md`
- 🚀 Deploy: `docs/WORKER_DEPLOYMENT.md`
- 🔍 Check: `pnpm queue:check`
- 📊 Monitor: `pnpm import:monitor-vercel <ID>`

✅ **All set to deploy!**
