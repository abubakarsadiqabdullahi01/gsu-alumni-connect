# Vercel Deployment (Neon + Prisma + Better Auth)

## 1) One-time Vercel setup
1. Push your project to GitHub.
2. In Vercel: **Add New Project** -> import this repo.
3. Framework: Next.js (auto-detected).
4. Build command: keep default (`next build`) unless you customized it.

## 2) Environment variables (Production + Preview)
Set these in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL` = Neon pooled URL (runtime)
- `DIRECT_URL` = Neon direct URL (for migrations/scripts)
- `BETTER_AUTH_SECRET` = long random secret
- `BETTER_AUTH_URL` = your Vercel production URL (e.g. `https://your-app.vercel.app`)
- `NEXT_PUBLIC_APP_URL` = same as production URL

Also add app-specific secrets if you use them:

- `PUSHER_APP_ID`
- `PUSHER_KEY`
- `PUSHER_SECRET`
- `PUSHER_CLUSTER`
- `NEXT_PUBLIC_PUSHER_KEY`
- `NEXT_PUBLIC_PUSHER_CLUSTER`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `TERMII_API_KEY`
- `TERMII_SENDER_ID`
- `UPLOADTHING_SECRET`
- `UPLOADTHING_APP_ID`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## 3) Database migrations (recommended workflow)
Run migrations from your local machine (or CI) against production DB before/with deploy.

```bash
set "DATABASE_URL=%DIRECT_URL%"
pnpm prisma migrate deploy
```

## 4) Deploy
Trigger deployment by pushing to your default branch.

```bash
git add .
git commit -m "chore: prepare vercel deployment"
git push origin main
```

## 5) Post-deploy checks
1. Open app URL.
2. Test login.
3. Test an admin API route.
4. Confirm DB reads/writes work.

## 6) Create first production admin
Run this with production env values loaded:

```bash
node scripts/setup-admin.cjs --email admin@alumni.gsu.edu.ng --password "Admin@123" --name "Dr Muhammad Khabir"
```

## Notes
- `postinstall` runs `prisma generate` so Vercel build has Prisma client generated.
- Runtime uses `DATABASE_URL`; keep it as Neon pooled URL.
- Keep `DIRECT_URL` for migration and maintenance scripts.
