# Deploy Import Worker to Railway

## Setup Steps

### 1. Create Railway Account
- Go to https://railway.app
- Sign up with GitHub
- Create a new project

### 2. Deploy the Worker

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize Railway in project
railway init

# Deploy
railway up
```

### 3. Configure Environment Variables
In Railway Dashboard:
- Add all `.env.local` variables (DATABASE_URL, REDIS_URL, etc.)
- Set `NODE_ENV=production`

### 4. Verify Worker is Running
```bash
# From your local machine
pnpm tsx scripts/monitor-vercel-jobs.ts <JOB_ID> https://your-vercel-url.vercel.app
```

## Alternative: Use Render

### 1. Create Render Account
- Go to https://render.com
- Sign up

### 2. Create Web Service
- Connect GitHub repo
- Set Build Command: `pnpm install && pnpm db:generate`
- Set Start Command: `pnpm worker:import`
- Add Environment Variables from `.env.local`
- Set Plan to "Starter" (free tier with auto-sleep)

## How It Works

1. **Vercel (API)**: Receives import requests → queues to Redis
2. **Worker (Railway/Render/Local)**: Continuously polls Redis queue → processes jobs
3. **Status API**: Available on both platforms for monitoring

## Job Flow

```
Upload File (Vercel) → Queue Job to Redis
                         ↓
   Monitor Status (Vercel API)
                         ↓
   Worker (Railway) → Process from Queue → Update Job Status
                         ↓
   Check Status (Vercel API) → Shows Progress
```

## Monitor Worker Logs

### Local
```bash
pnpm worker:import
# Shows live logs
```

### Railway
```bash
railway logs
```

### Render
```bash
# View in Render Dashboard Logs tab
```
