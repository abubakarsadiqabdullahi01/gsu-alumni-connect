# Scripts Directory - Graduate Import Tools

## Overview

This directory contains utility scripts for managing and optimizing the graduate import process.

## Available Scripts

### 1. **monitor-import.ts** - Performance Monitoring
Monitor and analyze import performance in real-time.

**Usage:**
```bash
npm run import:monitor           # Full benchmark report
npm run import:check-indexes     # Verify database indexes
npm run import:analyze           # Query performance analysis
```

**What it checks:**
- ✓ Database connection status
- ✓ Index presence and configuration
- ✓ System memory and resources
- ✓ Query performance metrics
- ✓ Cache effectiveness

**Output:**
```
🚀 Graduate Import Performance Monitor

🖥️  System Information

┌──────────────────────┬──────────────────┐
│ Component            │ Status           │
├──────────────────────┼──────────────────┤
│ Database Connection  │ ✓ Connected      │
│ Environment          │ production       │
│ Memory               │ 245MB            │
└──────────────────────┴──────────────────┘

📊 Database Index Status

User.registrationNo: ✓ Present
AlumniGroup.slug: ✓ Present
GroupMember.groupId: ✓ Present
GroupMember.graduateId: ✓ Present

📈 Performance Benchmark Report

┌───────────────┬──────────┬────────┬─────────────┬──────────┐
│ Test          │ Duration │ Rows   │ Throughput  │ Per-Row  │
├───────────────┼──────────┼────────┼─────────────┼──────────┤
│ Last Import   │ 2500ms   │ 100    │ 40 rows/sec │ 25ms     │
└───────────────┴──────────┴────────┴─────────────┴──────────┘

💡 Optimization Recommendations

✓ Per-row time is good (<30ms)
✓ Throughput is good (>50 rows/sec)
```

---

## Configuration Files

### Environment Variables (.env.production)

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/gsu_alumni?sslmode=require"

# Import Settings
NODE_ENV="production"
LOG_QUERIES="false"          # Disable query logging in production

# Performance Tuning (optional)
IMPORT_BATCH_SIZE=50         # Rows per batch
IMPORT_PARALLEL_BATCHES=3    # Concurrent batches
IMPORT_TIMEOUT=30000         # Transaction timeout (ms)
```

---

## Running Imports

### Via Admin Dashboard
1. Navigate to `http://localhost:3000/admin/uploads`
2. Click "Import Graduates"
3. Select Excel file
4. Monitor progress in real-time

### Via API
```bash
curl -X POST http://localhost:3000/api/graduates/import \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rows": [...],      // Parsed Excel rows
    "sheets": ["2024"], // Sheet names
    "fileName": "graduates-2024.xlsx"
  }'
```

### Response Format (Server-Sent Events)
```
data: {"sheet":"2024","processed":50,"total":1000,"created":48,"updated":2,"skipped":0,"failed":0,"status":"processing"}

data: {"sheet":"2024","processed":100,"total":1000,"created":96,"updated":4,"skipped":0,"failed":0,"status":"processing"}

...

data: {"sheet":"2024","processed":1000,"total":1000,"created":950,"updated":50,"skipped":0,"failed":0,"status":"done"}
```

---

## Troubleshooting

### Import Hangs or Times Out

**Cause:** Transaction exceeding timeout
```
Error: A query cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms
```

**Solution:** The timeout has been increased to 15 seconds in production. If still failing:

1. Check database load:
   ```bash
   psql -U admin -h localhost gsu_alumni -c "SELECT count(*) FROM pg_stat_activity;"
   ```

2. Verify connection pool:
   ```bash
   psql -U admin -h localhost gsu_alumni -c "SHOW max_connections;"
   ```

3. Reduce batch size in code:
   ```typescript
   const BATCH_SIZE = 25;  // Was 50
   ```

### Duplicate Registration Numbers

**Cause:** Import running twice simultaneously
```
Error: duplicate key value violates unique constraint "user_registration_no_key"
```

**Solution:**
1. Check active imports: `SELECT * FROM upload_audit_log WHERE status='PROCESSING';`
2. Cancel stuck job if needed
3. Check for data integrity: `SELECT registration_no, COUNT(*) FROM "user" GROUP BY registration_no HAVING COUNT(*) > 1;`

### Foreign Key Constraint Errors

**Cause:** Groups not found when adding members
```
Error: Foreign key constraint violated on the constraint: `group_member_group_id_fkey`
```

**Solution:**
1. Verify indexes exist: `npm run import:check-indexes`
2. Clear group cache and retry
3. Check group creation: `SELECT * FROM alumni_group WHERE type='COHORT' ORDER BY created_at DESC;`

### Memory Issues

**Cause:** Batch size too large for available memory
```
Error: JavaScript heap out of memory
```

**Solution:**
```typescript
const BATCH_SIZE = 10;  // Reduce significantly
```

---

## Performance Tuning

### For Small Datasets (<1,000 rows)
```typescript
const BATCH_SIZE = 100;        // Larger batches
const PARALLEL_BATCHES = 2;    // Fewer parallel
const QUERY_TIMEOUT = 20000;   // Shorter timeout
```

### For Large Datasets (>100,000 rows)
```typescript
const BATCH_SIZE = 25;         // Smaller batches
const PARALLEL_BATCHES = 5;    // More parallel
const QUERY_TIMEOUT = 45000;   // Longer timeout
```

### For Very Large Datasets (>1M rows)
- Implement Bull/BullMQ queue
- Use worker processes (3-5 workers)
- Set up Redis for caching
- Consider database replication

---

## Database Maintenance

### Check Index Health
```bash
npm run import:check-indexes
```

### Analyze Query Performance
```bash
npm run import:analyze
```

### Monitor Space Usage
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('gsu_alumni')) as size;

-- Check table sizes
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index sizes
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Rebuild Fragmented Indexes
```sql
-- Check index fragmentation (PostgreSQL 14+)
SELECT schemaname, tablename, indexname, 
  idx_blks_read, idx_blks_hit,
  ROUND(100.0 * idx_blks_hit / (idx_blks_hit + idx_blks_read), 2) as hit_ratio
FROM pg_statio_user_indexes
WHERE idx_blks_read + idx_blks_hit > 0
ORDER BY hit_ratio ASC;

-- Rebuild if needed
REINDEX INDEX CONCURRENTLY alumni_group_slug_idx;
```

---

## Logging

### Enable Query Logging (Development/Debugging)
```typescript
// lib/db.ts
export const prisma = new PrismaClient({
  log: [
    { emit: 'stdout', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});
```

### Parse Logs
```bash
# Show import events only
grep "\[import\]" logs/import.log

# Show errors during import
grep "ERROR" logs/import.log

# Count created/updated records
grep "successfully created\|successfully updated" logs/import.log | wc -l

# Show performance metrics
grep "throughput\|per-row\|Avg time" logs/import.log
```

---

## Monitoring & Alerts

### Setup CloudWatch Alarms (AWS)
```bash
# Alert on import errors
aws cloudwatch put-metric-alarm \
  --alarm-name graduate-import-errors \
  --metric-name ImportErrors \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold

# Alert on slow imports
aws cloudwatch put-metric-alarm \
  --alarm-name graduate-import-slow \
  --metric-name ImportDuration \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 300000 \
  --comparison-operator GreaterThanThreshold
```

### Setup Datadog Monitoring
```yaml
# datadog.yaml
logs:
  enabled: true
  config:
    logs:
      - type: file
        path: /app/logs/import.log
        source: graduate-import
        service: gsu-alumni-connect
        tags:
          - "env:production"
```

---

## Related Documentation

- **OPTIMIZATION_SUMMARY.md** - Overview of all optimizations
- **IMPORT_OPTIMIZATION_GUIDE.md** - Detailed optimization strategies
- **PRODUCTION_DEPLOYMENT_CHECKLIST.md** - Step-by-step deployment guide

---

## Support & Escalation

### Level 1: Self-Service
- Run `npm run import:monitor` for diagnostics
- Check TROUBLESHOOTING section above
- Review logs: `tail -f logs/import.log`

### Level 2: Database Admin
- Connection pool issues
- Query performance bottlenecks
- Index corruption

### Level 3: DevOps
- Server resources
- Network connectivity
- Backup/restore procedures

---

**Last Updated:** April 14, 2026

