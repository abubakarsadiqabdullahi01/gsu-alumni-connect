# ⚠️ IMPORTANT: Set Vercel Environment Variables

Before the next deployment succeeds, you MUST add these environment variables in the Vercel Dashboard:

## Go to: https://vercel.com/humsadtechnologies/gsu-alumni-connect/settings/environment-variables

## Required Variables (Add for Production + Preview + Development)

```
DATABASE_URL=postgresql://neondb_owner:npg_zUjKx3gdJhF6@ep-crimson-haze-akgkbluq-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true

DIRECT_URL=postgresql://neondb_owner:npg_zUjKx3gdJhF6@ep-crimson-haze-akgkbluq.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true

BETTER_AUTH_SECRET=GSUAlumniConnect2026SecretKey32Char

BETTER_AUTH_URL=https://gsu-alumni-connect.vercel.app

NEXT_PUBLIC_APP_URL=https://gsu-alumni-connect.vercel.app
```

## Optional (if using these services)

```
PUSHER_APP_ID=2122855
PUSHER_KEY=378145504acd953bb2c0
PUSHER_SECRET=0d4c5d0d698d137da044
PUSHER_CLUSTER=eu
NEXT_PUBLIC_PUSHER_KEY=378145504acd953bb2c0
NEXT_PUBLIC_PUSHER_CLUSTER=eu
```

## Steps

1. Go to https://vercel.com/humsadtechnologies/gsu-alumni-connect/settings/environment-variables
2. Click "Add New"
3. For each variable:
   - Name: (e.g., DATABASE_URL)
   - Value: (paste the value)
   - Environment: Select **Production**, **Preview**, **Development**
4. Click "Save"
5. After adding all variables, trigger a new deployment:
   ```powershell
   git commit --allow-empty -m "trigger rebuild"
   git push origin main
   ```

## Why This Failed

The previous deployment failed because:
- `postinstall` script tried to run `prisma generate`
- Prisma needs `DATABASE_URL` to generate the client
- Environment variables aren't available during `pnpm install` phase
- **Solution**: Moved `prisma generate` to `vercel-build` script (runs after env vars are loaded)

## Next Deployment Will Succeed If:

✅ Environment variables are set in Vercel Dashboard
✅ DATABASE_URL and DIRECT_URL point to your Neon database
✅ The new code is pushed to GitHub

---

**Action Required:** Add the environment variables NOW before pushing the next commit.
