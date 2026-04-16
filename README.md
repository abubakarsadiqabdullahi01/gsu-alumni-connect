This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Making User Admin
```bash
pnpm auth:make-admin -- --registration-no UG18/SCZO/1080
```

## 🚀 Import Worker & Monitoring (NEW!)

### Monitor Jobs on Vercel
```bash
# Monitor job progress in real-time
pnpm import:monitor-vercel <JOB_ID>

# Example
pnpm import:monitor-vercel f8acb5a7-a1e6-45a0-a15e-6c28d9fdf44d
```

### Check Queue Status
```bash
# See active/waiting/completed/failed jobs
pnpm queue:check
```

### Run Worker
```bash
# Process jobs locally (development)
pnpm worker:import

# For production: Deploy to Railway/Render
# See docs/WORKER_DEPLOYMENT.md
```

### Quick Workflow
```bash
# Terminal 1: Start API
pnpm dev

# Terminal 2: Start Worker
pnpm worker:import

# Terminal 3: Monitor
pnpm import:monitor-vercel <JOB_ID>
```

## 📚 Documentation

- **[START_HERE.md](./START_HERE.md)** ⭐ - Quick start guide
- **[docs/MONITOR_VERCEL_JOBS.md](./docs/MONITOR_VERCEL_JOBS.md)** - Complete monitoring guide
- **[docs/WORKER_DEPLOYMENT.md](./docs/WORKER_DEPLOYMENT.md)** - Deploy worker to production
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Pre/post deployment checks

See [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) for complete navigation.
