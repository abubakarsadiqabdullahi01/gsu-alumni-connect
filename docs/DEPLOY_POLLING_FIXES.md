# Deploy Import Polling Fixes - Step-by-Step

## Pre-Deployment Checklist

- [ ] Node.js 18+ installed locally
- [ ] `pnpm` installed
- [ ] `.env.local` configured with database and Redis URLs
- [ ] Git repository initialized

## Step 1: Verify Changes Locally

```bash
# Build the project to catch any TypeScript errors
pnpm build

# Expected output:
# ✓ Compiled successfully
# ✓ Finished TypeScript in 6.9s
# ✓ Collecting page data...
# ✓ Generating static pages...

# If errors occur, check:
# - components/upload/upload-client.tsx (retry logic syntax)
# - app/api/import-jobs/[id]/route.ts (error handling syntax)
```

## Step 2: Test Import Locally (5-10 minutes)

```bash
# Terminal 1: Start dev server
pnpm dev

# Terminal 2: Start import worker
pnpm worker:import

# Browser: http://localhost:3000/admin
# 1. Go to Uploads section
# 2. Select Excel file with 100-200 rows
# 3. Click "Import Graduates"
# 4. Watch import progress

# Expected:
# - Progress updates every 3 seconds
# - Completes in < 90 seconds
# - No "polling timed out" error
# - Status shows "COMPLETED" or "PARTIAL_SUCCESS"

# Verify in browser console (F12):
# - No "[Import] retrying" messages = no transient errors (good)
# - See "[Import] retrying" = auto-recovery working (also good)
```

## Step 3: Review Changes

```bash
# See exactly what changed
git diff

# Should show:
# 1. components/upload/upload-client.tsx:
#    - Timeout: 30min → 120min
#    - Added retry logic
#    - Added per-request timeout
#
# 2. app/api/import-jobs/[id]/route.ts:
#    - Added try-catch blocks
#    - Added 503 error handling
#    - Added background cache updates
```

## Step 4: Commit Changes

```bash
git add components/upload/upload-client.tsx app/api/import-jobs/[id]/route.ts

git commit -m "fix(import): extend polling timeout and add retry logic

Changes:
- Frontend polling timeout: 30min → 120min (accommodates DB delays)
- Per-request timeout: 60 seconds (prevents hanging)
- Automatic retry: 3 attempts with 2s/3s/4s backoff
- 503 error handling: Signals transient failures for retry
- Non-blocking cache: Faster status endpoint responses

Expected: Imports complete in ~75s without timeout errors

Fixes: Import polling timed out after 30 minutes"
```

## Step 5: Push to GitHub

```bash
git push origin main

# Monitor Vercel deployment:
# https://vercel.com/humsadtechnologies/gsu-alumni-connect/deployments

# Wait for:
# ✅ Build: Completed
# ✅ Production: Ready
```

## Step 6: Verify Production Deployment

```bash
# Wait 2-3 minutes for Vercel to complete build

# Check deployment:
https://gsu-alumni-connect.vercel.app/admin

# Test production import:
# 1. Upload file with 100-200 rows
# 2. Watch status updates
# 3. Should complete in < 90 seconds
# 4. No timeout error

# Monitor logs:
https://vercel.com/.../logs
# Filter for: "import-worker" or "api/import-jobs"
```

## Rollback If Needed

```bash
# If something breaks:
git revert HEAD  # Undo last commit

git push origin main  # Push revert

# Vercel auto-deploys within 5 minutes
# Old version automatically restored
```

## Monitoring Production

### Good Signs ✅
```
GET /api/import-jobs/[id] 200 in 3.2s
[import-worker] Checkpoint: 100/1108 processed
Import status: COMPLETED
```

### Warnings ⚠️
```
GET /api/import-jobs/[id] 503 - OK, will retry
[Import] Database temporarily unavailable, retrying - OK, auto-recovery
```

### Problems ❌
```
Import polling timed out - Fix didn't work
GET /api/import-jobs/[id] 500 - Database error
Connection terminated - Network issue
```

## Quick Reference

### Timeout Increased
- Old: 30 minutes
- New: 120 minutes
- Why: Import takes 75s, retries can add delay

### Retry Logic Added
- Trigger: 503 errors or network failures
- Attempts: Up to 3 tries
- Delays: 2s, 3s, 4s backoff
- Result: Auto-recovery without user action

### Per-Request Timeout
- Old: None (could hang forever)
- New: 60 seconds
- Why: Prevents entire polling loop from getting stuck

## Expected Impact

### Before Fix
```
Import starts → Database slow → Status endpoint times out
→ Frontend polling times out → Error: "polling timed out" ❌
```

### After Fix
```
Import starts → Status endpoint fast (cached) ✅
         OR
         → Database temporarily slow → 503 → Auto-retry ✅
         OR
         → Network timeout → Retry with backoff ✅
→ Status updates every 3 seconds
→ Import completes in ~75 seconds ✅
```

## Success Criteria

After deployment, verify:

- [ ] Imports complete in < 90 seconds
- [ ] No "polling timed out" errors
- [ ] Status updates every 3 seconds
- [ ] Error reports accurate
- [ ] No new errors in Vercel logs

---

**Deployment Time**: ~5-10 minutes (including verification)

**Risk Level**: LOW (backward compatible, can easily rollback)

**Expected Outcome**: Import polling now reliably completes without timeout errors.
