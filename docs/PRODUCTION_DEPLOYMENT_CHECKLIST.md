# Production Deployment Checklist - Graduate Import

## Phase 1: Database Optimization (2-3 minutes) ✓

### Apply Schema Changes
```bash
# Create migration for new indexes
npm run prisma:migrate -- --name add_production_indexes

# Review changes (should see @@index additions)
cat prisma/migrations/*/migration.sql

# Apply to development
npm run db:migrate

# PRODUCTION: Apply with precautions
npm run db:deploy  # Or manually via your DB admin tool
```

**What changed:**
- `User.@@index([registrationNo])` - Speeds up user lookups by registration number
- `GroupMember.@@index([groupId])` - Speeds up group member queries
- `GroupMember.@@index([graduateId])` - Speeds up member lookups

---

## Phase 2: Environment Configuration (1 minute) ✓

### Update `.env.production`
```bash
# Existing
DATABASE_URL="postgresql://user:pass@host:5432/gsu_alumni"

# Add connection pool settings
# (Postgres default pool is handled by PgBouncer or connection pooler)

# For PgBouncer (recommended for production)
# DATABASE_URL="postgresql://user:pass@pgbouncer-host:6432/gsu_alumni"

# OR for direct connection with larger pool
# DATABASE_URL="postgresql://user:pass@host:5432/gsu_alumni?sslmode=require&pool_size=20"

# Optional: Query logging (disable in production after testing)
NODE_ENV="production"
LOG_QUERIES="false"
```

### Verify Environment
```bash
# Test connection
npm run db:studio

# Check current import configuration
grep "BATCH_SIZE\|PARALLEL_BATCHES\|QUERY_TIMEOUT" app/api/graduates/import/route.ts
```

---

## Phase 3: Pre-Import Testing (5-10 minutes) ✓

### Test with Small Dataset (10-50 rows)
```bash
curl -X POST http://localhost:3000/api/graduates/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rows": [...],  // 10 test rows
    "sheets": ["2019-2020"],
    "fileName": "test-import.xlsx"
  }'

# Monitor logs
# Should see:
# - "Processing batch of 50 rows"
# - "Cache prewarm: Found X groups"
# - "[import] Processed 10 in XXms"
# - "Avg per-row: XXms"
```

### Monitor Performance
```typescript
// Expected metrics for 10 new rows with 4 groups each:
// Total time: 2-5 seconds
// Per-row time: 200-500ms
// DB queries: ~15-20 (depends on cache hits)
```

### Check for Errors
```bash
# Look for:
# ❌ "Transaction timeout" - Increase timeout in route.ts
# ❌ "Foreign key constraint" - Check group cache logic
# ✅ "successfully created/updated" - Good!
```

---

## Phase 4: Performance Monitoring Setup (5 minutes) ✓

### Enable Request Logging
```typescript
// app/api/graduates/import/route.ts - Already included

// Add to your logging service:
const importStartTime = Date.now();
const duration = Date.now() - importStartTime;

console.log({
  event: 'import_completed',
  rows: rows.length,
  duration_ms: duration,
  rows_per_second: (rows.length / (duration / 1000)).toFixed(2),
  timestamp: new Date().toISOString(),
});
```

### Setup Alerts (PagerDuty / Datadog / CloudWatch)
```
Alert if:
- Import takes > 5 minutes for 1,000 rows
- Error rate > 5%
- Transaction timeouts > 0 (indicates DB overload)
- DB connection pool exhausted
```

---

## Phase 5: Production Import (Run During Low Traffic)

### Recommended Timing
- **Time**: 2 AM - 5 AM (off-peak)
- **Size**: Start with < 5,000 rows
- **Duration**: ~5-10 minutes for 5,000 rows
- **Who**: Admin user with logging enabled

### Pre-Import Checklist
```bash
# ✓ Backup database
pg_dump gsu_alumni > backup_$(date +%s).sql

# ✓ Clear any pending jobs
redis-cli FLUSHDB  # if using Redis

# ✓ Check system resources
free -h           # Memory
df -h             # Disk
ps aux | grep pg* # Database processes

# ✓ Verify imports endpoint is working
curl http://localhost:3000/api/graduates/import \
  -X OPTIONS \
  -H "Authorization: Bearer TEST_TOKEN"
```

### Execute Import
```bash
# Option 1: Via Admin Dashboard
# 1. Go to http://localhost:3000/admin/uploads
# 2. Click "Import Graduates"
# 3. Select file
# 4. Watch progress stream in real-time

# Option 2: Via cURL
curl -X POST http://localhost:3000/api/graduates/import \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data @import-payload.json \
  --output import-response.log

# Option 3: Via Node.js script
node scripts/bulk-import.js 2024-graduations.xlsx
```

### Monitor Import Progress
```bash
# Terminal 1: Watch logs
tail -f logs/import.log | grep "\[import\]"

# Terminal 2: Monitor DB connections
psql -U $DB_USER -d gsu_alumni -c "SELECT count(*) FROM pg_stat_activity;"

# Terminal 3: Monitor disk space
watch -n 5 "df -h | grep /dev"

# Terminal 4: Monitor API health
watch -n 5 "curl -s http://localhost:3000/health | jq ."
```

### Expected Output
```
POST /api/graduates/import 200 in 2.5s (compile: 14ms, render: 2.4s)
[import] Processed 50 rows in 1250ms
[import] Cache hits: 45, misses: 5
[import] Successfully created 48 users, updated 2
[import] Throughput: 40 rows/sec
```

---

## Phase 6: Post-Import Verification (5 minutes) ✓

### Check Database
```sql
-- Verify user count increased
SELECT COUNT(*) as total_users FROM "user";

-- Verify graduates created
SELECT COUNT(*) as total_graduates FROM graduate;

-- Check group memberships created
SELECT COUNT(*) as total_memberships FROM group_member;

-- Verify no orphaned records
SELECT COUNT(*) FROM graduate WHERE "userId" NOT IN (SELECT id FROM "user");
SELECT COUNT(*) FROM group_member WHERE "graduateId" NOT IN (SELECT id FROM graduate);

-- Check import audit trail
SELECT * FROM upload_audit_log ORDER BY created_at DESC LIMIT 5;
```

### Validate Data Integrity
```bash
# Run data validation script
node scripts/validate-import.js

# Expected output:
# ✓ All users have registration numbers
# ✓ All graduates linked to users
# ✓ All group memberships valid
# ✓ No duplicate registration numbers
# ✓ Entry years extracted correctly
```

### Check Query Performance
```sql
-- Verify indexes are being used
EXPLAIN ANALYZE
SELECT * FROM "user" WHERE "registrationNo" = 'UG19/ASAC/1025';

-- Should show "Index Scan" (not "Seq Scan")
```

---

## Phase 7: Scale for Large Imports (>10,000 rows)

### Option A: Increase Batch Size (Simple)
```typescript
// app/api/graduates/import/route.ts
const BATCH_SIZE = 100;        // Was 50
const PARALLEL_BATCHES = 5;    // Was 3
const QUERY_TIMEOUT = 45000;   // Was 30000
```

**Pros:** Simple, immediate
**Cons:** Higher memory usage, longer individual batch failures

### Option B: Implement Queue (Recommended)
```bash
# Install Bull (background job queue)
npm install bull
npm install @types/bull -D

# Create worker
cat > scripts/import-worker.ts << 'EOF'
import Queue from 'bull';

const importQueue = new Queue('graduate-import', {
  redis: { host: process.env.REDIS_HOST || 'localhost' },
  settings: {
    maxStalledCount: 2,
    stalledInterval: 5000,
    maxRetriesPerJob: 3,
  },
});

importQueue.process(async (job) => {
  const { rows, fileName } = job.data;
  // Process import in background
  // Update job progress: job.progress(50)
  return { created: 100, updated: 50 };
});

importQueue.on('completed', (job) => {
  console.log(`Import ${job.data.fileName} completed`);
});
EOF

npm run build
```

### Option C: Parallel Workers (Enterprise)
```bash
# Deploy 3 instances of import-worker
# Use load balancer to distribute imports
# Set up message queue (Kafka, RabbitMQ)
```

---

## Phase 8: Troubleshooting

### Problem: Import Hangs or Times Out
**Cause:** Transaction timeout or network latency
```bash
# Solution 1: Increase timeout
QUERY_TIMEOUT=60000  # 60 seconds

# Solution 2: Check DB connection
psql -U $DB_USER -h $DB_HOST gsu_alumni -c "SELECT 1;"

# Solution 3: Restart DB connection pool
# Restart application: npm run build && npm start
```

### Problem: "Foreign Key Constraint" Errors
**Cause:** Group not found when adding members
```bash
# Verify groups exist
SELECT * FROM alumni_group WHERE slug LIKE 'cohort-%';

# Check cache is warming
grep "prewarm" logs/import.log

# Solution: Clear cache and retry
npm run db:reset  # WARNING: Deletes all data
```

### Problem: Slow Import (>1 second per row)
**Cause:** Missing indexes or DB overload
```bash
# Check indexes exist
\d alumni_group        # In psql
\d group_member
\d "user"

# Add missing indexes
npm run prisma:migrate -- --name add_missing_indexes

# Check query performance
EXPLAIN ANALYZE SELECT * FROM alumni_group WHERE slug='test';
```

### Problem: "Out of Memory" Error
**Cause:** Batch size too large
```bash
# Reduce batch size
const BATCH_SIZE = 25;  # Was 50

# Or implement chunked streaming
# Read Excel row-by-row instead of all at once
```

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| **Rows per second** | 50-100 | 40-50 |
| **Per-row time** | 10-20ms | 20-30ms |
| **Memory usage** | < 500MB | ~300MB |
| **DB connections** | 3-5 | 3-5 |
| **Error rate** | < 0.5% | TBD |
| **Cache hit rate** | > 90% | TBD |

---

## Rollback Plan

If import fails or corrupts data:

```bash
# Option 1: Restore from backup (fast)
pg_restore -d gsu_alumni backup_1709111504.sql

# Option 2: Manual cleanup (if partial import)
DELETE FROM activity_feed_item WHERE "graduateId" IN (
  SELECT id FROM graduate WHERE "sourceSheet" = '2024-2025'
);
DELETE FROM group_member WHERE "graduateId" IN (
  SELECT id FROM graduate WHERE "sourceSheet" = '2024-2025'
);
DELETE FROM graduate WHERE "sourceSheet" = '2024-2025';
DELETE FROM "user" WHERE "registrationNo" LIKE 'UG%' AND "createdAt" > NOW() - INTERVAL '1 hour';

# Option 3: Stop the import mid-way
# (Endpoint supports cancellation via Ctrl+C)
```

---

## Maintenance Schedule

**Weekly:**
- Monitor import error logs
- Check database query performance
- Verify backup integrity

**Monthly:**
- Analyze slow queries (pg_stat_statements)
- Rebuild indexes if fragmented
- Review and optimize cache hit rates

**Quarterly:**
- Audit import logs for patterns
- Update batch size if needed
- Load test with realistic dataset

---

## Support Contacts
- **DB Admin**: DB performance issues
- **DevOps**: Server resources, Redis
- **QA**: Data validation, integrity checks

---

**Last Updated:** April 14, 2026
**Next Review:** After first production import

