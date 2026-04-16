# ✅ Deployment Checklist

## Pre-Deployment (Local Testing)

- [ ] Test locally with both Vercel and worker running
  ```bash
  # Terminal 1
  pnpm dev
  
  # Terminal 2
  pnpm worker:import
  ```

- [ ] Upload test file and monitor
  ```bash
  # Get JOB_ID from upload response
  pnpm import:monitor-vercel <JOB_ID>
  ```

- [ ] Check queue works
  ```bash
  pnpm queue:check
  ```

- [ ] Verify all commands work
  - [ ] `pnpm import:monitor-vercel` works
  - [ ] `pnpm queue:check` works
  - [ ] `pnpm worker:import` processes jobs

---

## Deploy to Vercel (Already Done)

- [ ] Main branch committed and pushed
- [ ] Vercel auto-deploys from GitHub
- [ ] Verify API works: https://gsu-alumni-connect.vercel.app/api/import-jobs
- [ ] Verify admin upload works: https://gsu-alumni-connect.vercel.app/admin/uploads

---

## Deploy Worker (Choose One)

### Option A: Keep Running Locally ✅ (Fastest)

```bash
# On your machine, keep running
pnpm worker:import

# Monitor from anywhere
pnpm import:monitor-vercel <JOB_ID>
```

**Pros:**
- Immediate
- Easy to debug
- Full visibility

**Cons:**
- Your machine must stay on
- Internet must stay connected

---

### Option B: Deploy to Railway ⭐ (Recommended)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Deploy
railway init
railway up

# 4. Set environment variables in Railway dashboard
# Add all variables from .env.local:
# - DATABASE_URL
# - REDIS_URL (or UPSTASH_* vars)
# - All other env vars

# 5. Monitor
railway logs
```

**Pros:**
- Runs 24/7
- Easy deployment
- Good free tier

**Cons:**
- Need Railway account
- Slight learning curve

---

### Option C: Deploy to Render

```bash
# 1. Go to https://render.com
# 2. Click "New +" → "Web Service"
# 3. Connect GitHub repository
# 4. Set:
#    - Build: pnpm install && pnpm prisma generate
#    - Start: pnpm worker:import
# 5. Add environment variables
# 6. Deploy
# 7. View logs in dashboard
```

**Pros:**
- Easy GUI
- Auto-scaling
- Free tier available

**Cons:**
- Slower deployment
- Free tier has sleep

---

## Post-Deployment

- [ ] Verify worker is processing jobs
  ```bash
  pnpm queue:check
  # Should show active jobs if worker is running
  ```

- [ ] Test monitoring on Vercel
  ```bash
  # Upload file on Vercel
  # Copy JOB_ID
  pnpm import:monitor-vercel <JOB_ID> https://gsu-alumni-connect.vercel.app
  ```

- [ ] Check logs
  - Local: See output in terminal
  - Railway: `railway logs`
  - Render: Check dashboard

- [ ] Create monitoring cron job (optional)
  ```bash
  # Check queue status every hour
  0 * * * * cd ~/gsu-alumni-connect && pnpm queue:check >> ~/import-worker.log
  ```

---

## Troubleshooting Checklist

### Job Not Processing

- [ ] Check if worker is running
  ```bash
  pnpm queue:check  # Should show active jobs
  ```

- [ ] Check worker logs
  - Local: Look at terminal
  - Railway: `railway logs`
  - Render: Check dashboard

- [ ] Restart worker
  ```bash
  # Local
  pnpm worker:import
  
  # Railway
  railway restart
  
  # Render
  Restart in dashboard
  ```

### Job Stuck / Timeout

- [ ] Check database connection
  ```bash
  pnpm db:studio  # Local test
  ```

- [ ] Check Redis connection
  ```bash
  pnpm queue:check
  ```

- [ ] Check error logs
  ```bash
  # Look for error in worker logs
  # Might be a validation issue
  ```

### Monitoring Not Working

- [ ] Verify Vercel URL is correct
  ```bash
  pnpm import:monitor-vercel <ID> https://gsu-alumni-connect.vercel.app
  ```

- [ ] Check job ID is correct
  ```bash
  # Get from upload response or admin/uploads page
  ```

- [ ] Test API directly
  ```bash
  curl https://gsu-alumni-connect.vercel.app/api/import-jobs/<ID>
  ```

---

## Going Live Checklist

- [ ] Worker running and processing jobs
- [ ] Monitoring working via `pnpm import:monitor-vercel`
- [ ] Admin upload page accessible
- [ ] Error handling tested
- [ ] Database backups working
- [ ] Redis backups configured
- [ ] Logs being monitored

---

## Documentation for Team

Share these files with team:
- [ ] `START_HERE.md` - Quick start guide
- [ ] `QUICK_VERCEL_MONITORING.md` - Quick reference
- [ ] `MONITOR_VERCEL_JOBS.md` - Detailed guide
- [ ] `WORKER_DEPLOYMENT.md` - How to deploy worker

---

## Optional Enhancements

- [ ] Set up alerting for failed jobs
  ```bash
  # Create notification when job fails
  # See: /api/import-jobs/[id]/route.ts
  ```

- [ ] Add retry logic for stalled jobs
  ```bash
  # Already in: workers/import-worker.ts (uses BullMQ retry)
  ```

- [ ] Dashboard for job statistics
  ```bash
  # Already available at: /admin/uploads
  ```

---

## Final Checklist

- [ ] All 3 new commands added to package.json
- [ ] Documentation files created
- [ ] Worker deployment decision made (Local/Railway/Render)
- [ ] Worker running or scheduled to run
- [ ] Monitoring tested from local machine
- [ ] Team notified of new setup
- [ ] Backups configured

**Status:** ✅ Ready for deployment!

---

## Support Commands

```bash
# Monitor production job
pnpm import:monitor-vercel <JOB_ID> https://gsu-alumni-connect.vercel.app

# Check queue
pnpm queue:check

# Run worker locally
pnpm worker:import

# View docs
cat START_HERE.md
cat docs/QUICK_VERCEL_MONITORING.md
cat docs/WORKER_DEPLOYMENT.md
```

**Last Updated:** April 16, 2026
