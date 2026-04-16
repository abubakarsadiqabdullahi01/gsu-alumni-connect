# Import Polling Fix - Test & Verification Guide

## What Was Fixed

Your import was failing with "Import polling timed out" because:

1. ❌ **Frontend gave up too soon** (30 min limit) while backend was slow
2. ❌ **No retry logic** for transient DB connection failures  
3. ❌ **Backend endpoint slow** (39.8s response time)
4. ❌ **No error recovery** - any timeout killed the whole import

## The Fixes Applied

### ✅ Fix 1: Extended Polling Timeout
- **Before**: 30 minutes
- **After**: 120 minutes (2 hours)
- **Why**: Import takes ~75 seconds, but connection issues can add delays

### ✅ Fix 2: Per-Request Timeout
- **Before**: No timeout, requests could hang forever
- **After**: Each status request times out after 60 seconds
- **Why**: Prevents entire polling loop from getting stuck on one request

### ✅ Fix 3: Automatic Retry Logic
- **Added**: 3 retry attempts with 2s/3s/4s delays
- **Handles**: 503 responses and network errors
- **Why**: Transient DB connection failures now auto-recover

### ✅ Fix 4: Better Error Responses
- **Before**: 500 Server Error on any database failure
- **After**: 503 Service Unavailable on transient failures (signals retry)
- **Why**: Client knows which errors are worth retrying

## How to Test

### Test 1: Normal Import (Should Complete in ~75 seconds)

```bash
# Step 1: Start the import worker
pnpm worker:import

# Step 2: In browser, upload a file with 1,000+ rows
# Watch the admin dashboard

# Expected:
✅ Pre-warming: ~10s
✅ Pre-hashing: ~8s  
✅ Row processing: ~55s
✅ Total: ~75 seconds
✅ No "polling timed out" error
✅ Status shows "COMPLETED" or "PARTIAL_SUCCESS"
```

### Test 2: Retry Logic (Simulate Connection Issues)

```bash
# You can't easily simulate DB timeout without breaking things,
# but the logs will show retries if they occur:

# Look for patterns like:
# "[Import] Database temporarily unavailable, retrying (1/3)..."
# This means retry logic is working

# Or with network issues:
# "[Import] Fetch error (1/3), retrying..."
```

### Test 3: Long Polling (Verify 2-hour timeout)

```bash
# Don't actually need to test this - unlikely to exceed 2 hours
# But you can verify in code:
# components/upload/upload-client.tsx line ~128:
# const maxPollingDurationMs = 120 * 60 * 1_000; // 2 hours
```

### Test 4: Cache is Working

Watch network tab in browser DevTools:
```
Request 1: GET /api/import-jobs/[id] → 3.2s (database query, then cached)
Request 2: GET /api/import-jobs/[id] → 0.1s (cache hit, fast!)
Request 3: GET /api/import-jobs/[id] → 0.1s (cache hit again)
```

## What the Logs Should Show

### Worker Log (Terminal 1: `pnpm worker:import`)
```
[import-worker] Pre-warming groups for 1108 rows...
[import-worker] Creating/warming 69 alumni groups...
[import-worker] Alumni groups ready (137 total)
[import-worker] Pre-hashing 846 passwords...
[import-worker] Password pre-hashing complete
[import-worker] Starting row processing (1108 rows, batch size 10)...
[import-worker] Checkpoint: 100/1108 processed (X created, X updated, 0 failed, 15.2 rows/sec)
[import-worker] Checkpoint: 200/1108 processed (X created, X updated, 0 failed, 15.2 rows/sec)
...
[import-worker] job finished with 1108/1108 processed, X created, X updated, 0 failed
```

### Frontend Log (Browser Console - if upload is slow)
```
[Import] Database temporarily unavailable, retrying (1/3)...
[Import] Database temporarily unavailable, retrying (2/3)...
[Import] Fetch error (1/3), retrying...
```

**Note**: If retry logs don't appear, it's good - means no transient failures!

## Monitoring Success

### ✅ Success Signs
- Import completes in < 90 seconds
- Status shows "COMPLETED" or "PARTIAL_SUCCESS" (not timeout error)
- Network tab shows `/api/import-jobs/[id]` returning 200 OK
- No "Connection terminated" errors in browser console

### ⚠️ Warning Signs
- Status requests taking > 20 seconds
- Lots of 503 responses (might indicate DB is very overloaded)
- Network errors / connection resets

### ❌ Failure Signs
- "Import polling timed out" error appears
- 500 Server Error on status requests
- Job status never updates (stuck on "RUNNING")

## If Import Still Times Out

### Step 1: Check Worker is Running
```bash
# Terminal should show:
# [import-worker] ready (queue=import-jobs, concurrency=1)
# [import-queue] redis ready
# [import-worker] redis connection ready
```

### Step 2: Check Database Connection
```bash
# Look for errors like:
# "Connection terminated due to connection timeout"
# This means Neon database is slow or overloaded

# Solutions:
# 1. Wait a few minutes and retry
# 2. Check Neon dashboard (https://console.neon.tech/)
# 3. Consider upgrading Neon plan if getting rate-limited
```

### Step 3: Check Redis Connection
```bash
# Look for errors like:
# "[import-queue] redis error: ..."

# Solutions:
# 1. Verify IMPORT_QUEUE_REDIS_URL in .env.local
# 2. Check Redis availability
# 3. Restart worker: Ctrl+C then `pnpm worker:import`
```

### Step 4: Check Import Data Quality
```bash
# Look for errors like:
# "Invalid registration number"
# "Missing name"

# Solutions:
# See: docs/DATA_VALIDATION_REQUIREMENTS.md
# Clean your Excel file and re-import
```

## Deployment to Production

Before pushing to Vercel:

```bash
# 1. Test locally
pnpm dev  # Terminal 1
pnpm worker:import  # Terminal 2
# Upload file in admin dashboard, verify completes

# 2. Build check
pnpm build  # Should pass without errors

# 3. Push to GitHub
git add .
git commit -m "fix(import): extend polling timeout and add retry logic"
git push origin main

# 4. Monitor Vercel
# Watch logs at: https://vercel.com/humsadtechnologies/gsu-alumni-connect/logs
# Filter for: "import-worker" and "api/import-jobs"
```

## Rollback If Needed

If something breaks:
```bash
git revert HEAD
git push origin main
# Vercel auto-redeploys within 5 minutes
```

---

**Timeline**: Import should now reliably complete in ~75 seconds. If it still times out, check the root causes above (worker, database, Redis, or data quality).
