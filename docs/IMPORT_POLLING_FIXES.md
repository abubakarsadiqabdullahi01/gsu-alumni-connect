# Import Polling Timeout Fixes

## Problem
Import job polling was timing out at 30 minutes with errors:
- `GET /api/import-jobs/[id]` taking 39.8 seconds to respond
- Connection timeouts: "Connection terminated due to connection timeout"
- Frontend polling failed with: "Import polling timed out. Refresh and check job status."

## Root Causes
1. **Frontend timeout too short**: 30 minutes limit being hit because backend status endpoint was slow
2. **Backend connection issues**: Prisma queries timing out when database pool was exhausted
3. **No retry logic**: Frontend gave up immediately on slow responses
4. **No error recovery**: 503 Service Unavailable responses not handled properly

## Solutions Implemented

### 1. Frontend Polling Timeout Extended (components/upload/upload-client.tsx)
```
Before: 30 minutes (30 * 60 * 1_000 ms)
After:  120 minutes (120 * 60 * 1_000 ms) 
```
**Why**: Even with optimizations, import can take 60-90 seconds. Added 2-hour buffer for network delays and database connection issues.

### 2. Per-Request Timeout Added (components/upload/upload-client.tsx)
```
Added: signal: AbortSignal.timeout(60_000)
```
**Why**: Individual fetch requests now timeout after 60 seconds instead of hanging indefinitely, preventing the entire polling loop from getting stuck.

### 3. Retry Logic with Exponential Backoff (components/upload/upload-client.tsx)
```typescript
// Retry up to 3 times if endpoint returns 503
// Wait 2s, 3s, 4s between retries
// Handles transient database connection failures
```
**Why**: Database connection timeouts are temporary. Retrying automatically recovers without user intervention.

### 4. Status Endpoint Resilience (app/api/import-jobs/[id]/route.ts)
```typescript
try {
  // Try Redis cache first (fast path)
  const cached = await redisGetJson(...);
  if (cached) return cached;
} catch (error) {
  // Cache errors don't block - continue to database
}

try {
  // Database query with proper error handling
  const job = await prisma.importJob.findUnique(...);
} catch (error) {
  // Return 503 on database failure instead of 5xx
  // Signals to client: "retry this, it's temporary"
  return NextResponse.json(
    { error: "Database connection temporarily unavailable" },
    { status: 503 }
  );
}
```
**Why**: Separates permanent errors (404, 401) from transient errors (503), allows client-side retry logic to work.

### 5. Background Cache Updates (app/api/import-jobs/[id]/route.ts)
```typescript
// Cache set doesn't block response
void redisSetJson(...).catch((err) => console.error(...));
```
**Why**: Even if caching fails, endpoint still responds quickly. Cache is a performance optimization, not a requirement.

## Expected Behavior After Fixes

### Successful Import (1,108 rows)
```
Pre-warming:        ~10 seconds
Pre-hashing:        ~8 seconds
Row processing:     ~55 seconds (50 rows/sec)
Status polling:     ~2 seconds per request (cached)
────────────────────────────────
Total:              ~75 seconds ✅
```

### Handling Transient Connection Issues
```
Request 1: Takes 5s (database slow)
Request 2: Takes 3s (database responds)
Request 3: 503 Service Unavailable
  └─ Client retries after 2 seconds
Request 4: 200 OK (cache hit, <100ms)
```

### Polling Flow with Retries
```
Frontend polling loop (every 3 seconds):
├─ Request 1: 503 → Retry in 2s
├─ Request 2: 200 OK (cache) → Continue
├─ Request 3: 200 OK (cache) → Continue
└─ Repeat until COMPLETED or FAILED
```

## Testing the Fix

### Local Testing
```bash
# Terminal 1: Start worker
pnpm worker:import

# Terminal 2: Trigger import
# Upload 1,108 rows, watch logs

# Expected: Completes in ~75 seconds, no polling timeout
```

### Monitoring
Watch for these patterns in logs:
```
✅ [import-worker] Starting row processing (1108 rows...)
✅ [import-worker] Checkpoint: 100/1108 processed (XX created, XX updated...)
✅ GET /api/import-jobs/[id] 200 in 3.2s (cache hit)
✅ Import polling timed out - won't appear (2 hour limit)

❌ [import-worker] Failed to hash password - indicates data issue
❌ GET /api/import-jobs/[id] 503 - temporary, should retry and succeed
```

## Database Connection Improvements (From Previous Fixes)

These changes complement the polling fixes:
- **Pool size**: Increased from 3→8 connections
- **Transaction timeout**: Reduced to 8 seconds (transactions now lean: 3 ops only)
- **Pre-warming**: Groups created before processing (no per-row upserts)
- **Pre-hashing**: Passwords hashed in parallel before transactions

## Fallback Behavior

If user closes browser or navigates away during import:
1. Worker continues processing (independent of frontend)
2. Import job saved in database with checkpoint at `lastRow`
3. User can refresh page and polling resumes
4. Database query still works (either cached or fresh)

## Future Improvements

If issues persist:
1. **Stream updates via WebSocket**: Real-time updates instead of polling
2. **Server-Sent Events (SSE)**: One-way server→client streaming
3. **Chunked processing**: Import in 100-row batches with separate routes
4. **External queue worker**: Move import worker outside serverless function runtime

---

**Summary**: Frontend now handles transient failures gracefully, backend returns proper HTTP status codes for retry logic, and polling timeout is generous enough to accommodate database delays. Import should now complete reliably without timeout errors.
