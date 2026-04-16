## Quick Reference: Check Worker Status on Vercel

### From Your Local Terminal:

**1. Monitor Job Directly (Best)**
```bash
pnpm import:monitor-vercel JOB_ID
# Example:
pnpm import:monitor-vercel f8acb5a7-a1e6-45a0-a15e-6c28d9fdf44d
```
Shows: ✅ Progress, stats, created/updated count in real-time

---

**2. Check Redis Queue**
```bash
pnpm queue:check
```
Shows: 🟢 Active jobs, ⏳ Waiting, ✅ Completed, ❌ Failed

---

**3. View in Vercel Dashboard**
```
https://gsu-alumni-connect.vercel.app/admin/uploads
```
Shows: Upload history, job status, download error reports

---

### How It Works:

1. **Vercel (serverless)**: Receives upload → Queues to Redis
2. **Worker (must run separately)**:
   - Local: `pnpm worker:import`
   - Production: Railway/Render/Your Server
3. **Status**: Available via API `/api/import-jobs/{id}`

---

### Setup Worker on Production:

**Option A: Keep Running on Local Machine**
```bash
pnpm worker:import
# Processes jobs from Vercel + local
```

**Option B: Deploy to Railway**
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

**Option C: Deploy to Render**
- Connect repo on https://render.com
- Start Command: `pnpm worker:import`
- Set ENV vars from `.env.local`

---

### Key Points:

❌ **Cannot run on Vercel** - Serverless functions timeout after 5 minutes  
✅ **Can queue jobs on Vercel** - Redis handles queuing  
✅ **Must run worker elsewhere** - Local machine, Railway, Render, etc.  
✅ **Can monitor from anywhere** - Via API polling  

---

### New Commands Added:

```bash
pnpm import:monitor-vercel      # Monitor job on Vercel
pnpm queue:check                # Check Redis queue status
pnpm worker:import              # Run worker locally
```
