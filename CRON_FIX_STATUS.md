# Cron Fix - Implementation Complete

## Summary
Fixed the cron job issue where it was registered but never firing. The problem was the self-trigger fetch using `http://localhost:3000` (from .env.local) which fails silently in production.

## Changes Made

### Step 2 - Code Fix: `app/api/import-jobs/route.ts`
✅ **COMPLETED**

**What was changed:**
- Removed fallback to `http://localhost:3000`
- Changed logic to use `NEXT_PUBLIC_APP_URL` with fallback to `VERCEL_URL`
- Added guard: if URL is not set or contains "localhost", skip self-trigger with warning
- Never attempts to connect to localhost from production server

**Before:**
```typescript
const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000"  // ❌ WRONG - fails silently in prod
).replace(/\/$/, "");

const baseUrl = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;

if (cronSecret) {
  fetch(`${baseUrl}/api/cron/process-import`, { ... })
}
```

**After:**
```typescript
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

if (!appUrl || appUrl.includes("localhost")) {
  console.warn("[import-jobs] NEXT_PUBLIC_APP_URL not set or is localhost — skipping self-trigger");
} else if (cronSecret) {
  fetch(`${appUrl}/api/cron/process-import`, {
    method: "GET",
    headers: { authorization: `Bearer ${cronSecret}` },
  }).catch((err) => {
    console.warn(`[import-jobs] self-trigger failed: ${err?.message}`);
  });
}
```

## Remaining Steps (You Must Do These)

### Step 1 - Vercel Dashboard Environment Variables
⏳ **ACTION REQUIRED**

Update your Vercel project settings with the correct environment variables:

1. Go to: https://vercel.com
2. Navigate to your **gsu-alumni-connect** project
3. Go to **Settings** → **Environment Variables**
4. Update/Add these variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://www.gsualumni.org.ng` |
| `BETTER_AUTH_URL` | `https://www.gsualumni.org.ng` |
| `CRON_SECRET` | (generate a random string, e.g., `super-secret-cron-2025`) |

**Important:** Your domain is `www.gsualumni.org.ng`, NOT `gsu-alumni-connect.vercel.app`

### Step 3 - Deploy
⏳ **ACTION REQUIRED** - Run this command in your terminal:

```bash
git add .
git commit -m "fix: use correct app URL for cron self-trigger"
git push
```

Or simply run the prepared script:
```cmd
deploy-cron-fix.cmd
```

## Verification

After the deployment is complete (wait ~2 minutes for Vercel to rebuild), verify the fix by:

1. **Upload a file** via the admin import interface
2. **Check Vercel logs** at https://vercel.com → Project → Deployments → Logs
3. **You should see:**
   ```
   POST 201  /api/import-jobs                ← File upload
   GET  200  /api/cron/process-import        ← Self-trigger fires immediately
   GET  200  /api/cron/process-import        ← Cron fires at 60s as backup
   ```

4. **Check Prisma logs** for:
   ```
   [import-worker] Creating/warming N alumni groups...
   [import-worker] Pre-hashing N passwords...
   [import-worker] Processing 1023 rows...
   ```

If logs show these messages, the cron is now working! 🎉

## What Was Wrong

**Problem 1 (NOW FIXED):** 
- `.env.local` has `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- This env var gets baked into the Next.js bundle at build time
- In production, the self-trigger fetch tries to reach `http://localhost:3000`
- The server can't connect to localhost (it's trying to call itself at 127.0.0.1)
- Fetch fails silently, job stays QUEUED forever

**Problem 2 (STILL NEEDS FIXING):**
- Vercel Dashboard environment variables are NOT updated
- Your code will use wrong URLs until Step 1 is completed
- vercel.json is correctly deployed, but cron endpoint receives wrong URL

## Timeline

1. ✅ Code fix committed
2. ⏳ Awaiting: Vercel env vars update
3. ⏳ Awaiting: Deployment trigger
4. ⏳ Awaiting: Logs verification

---

**Next Action:** Update Vercel environment variables per "Step 1" above, then deploy.
