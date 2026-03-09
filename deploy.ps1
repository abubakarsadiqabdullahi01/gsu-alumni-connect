# Commit and Deploy Script for Windows

Write-Host "📝 Committing all changes..." -ForegroundColor Cyan

git add .

git commit -m "fix: UTF-8 encoding issues and prepare for Vercel deployment

- Fix invalid UTF-8 characters in admin-job-detail-client.tsx
- Update lib/db.ts to support Neon SSL connections
- Add postinstall script for Prisma client generation
- Add admin setup script with DIRECT_URL support
- Add comprehensive deployment documentation
- Unlink from old Vercel project"

Write-Host ""
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Cyan

git push origin main

Write-Host ""
Write-Host "✅ Done! Vercel will automatically deploy the new build." -ForegroundColor Green
Write-Host "📊 Monitor deployment at: https://vercel.com/humsadtechnologies/gsu-alumni-connect" -ForegroundColor Yellow
