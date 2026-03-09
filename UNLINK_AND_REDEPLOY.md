# Unlink from Old Vercel Project and Deploy as New

The `.vercel` folder was linked to your old "alumni-system" project. Follow these steps to unlink and deploy as a fresh project:

## Step 1: Unlink from Old Project

Run this command in PowerShell:

```powershell
Remove-Item -Recurse -Force .vercel
```

Or manually delete the `.vercel` folder in your project root.

## Step 2: Deploy as New Project

```powershell
pnpm dlx vercel
```

When prompted:
- **"Set up and deploy..."** → `yes`
- **"Which scope..."** → `HumSad Technologies` (or your team)
- **"Link to existing project?"** → `no` ← IMPORTANT: Choose NO
- **"What's your project's name?"** → `gsu-alumni-connect` (or any new name)
- **"In which directory..."** → Press Enter (use current directory)
- **"Want to modify settings?"** → `no` (unless you need to change build settings)

## Step 3: Add Environment Variables

After creating the new project, add these in Vercel Dashboard:

### Required Variables (Production + Preview)
```
DATABASE_URL=<your Neon pooled URL>
DIRECT_URL=<your Neon direct URL>
BETTER_AUTH_SECRET=<long random string>
BETTER_AUTH_URL=https://your-new-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-new-app.vercel.app
```

### Optional (if you use these services)
```
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=eu
NEXT_PUBLIC_PUSHER_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=eu
RESEND_API_KEY=...
EMAIL_FROM=...
TERMII_API_KEY=...
TERMII_SENDER_ID=...
UPLOADTHING_SECRET=...
UPLOADTHING_APP_ID=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

## Step 4: Trigger Production Deployment

```powershell
pnpm dlx vercel --prod
```

Or push to your main branch (if you linked to GitHub):
```powershell
git add .
git commit -m "chore: redeploy as new vercel project"
git push origin main
```

## Step 5: Create Production Admin

After successful deployment, create your first admin:

```powershell
node scripts/setup-admin.cjs --email admin@alumni.gsu.edu.ng --password "Admin@123" --name "Dr Muhammad Khabir"
```

---

## Quick Commands Summary

```powershell
# 1. Unlink old project
Remove-Item -Recurse -Force .vercel

# 2. Deploy as new project (choose "no" when asked to link to existing)
pnpm dlx vercel

# 3. Add env vars in Vercel Dashboard (web UI)

# 4. Deploy to production
pnpm dlx vercel --prod

# 5. Create admin (with production DB vars loaded)
node scripts/setup-admin.cjs --email admin@alumni.gsu.edu.ng --password "Admin@123" --name "Dr Muhammad Khabir"
```

---

## Notes

- The old "alumni-system" project remains untouched
- This creates a completely new Vercel project
- You can delete the old project later if no longer needed
- Make sure to use the correct database URLs in environment variables
