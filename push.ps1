# Simple Commit and Push Script

Write-Host "📝 Staging all changes..." -ForegroundColor Cyan
git add .

Write-Host "📝 Committing changes..." -ForegroundColor Cyan
git commit -m "fix: UTF-8 encoding and Vercel deployment prep"

Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Cyan
git push origin main

Write-Host ""
Write-Host "✅ Done! Check Vercel dashboard for deployment status." -ForegroundColor Green
Write-Host "📊 https://vercel.com/humsadtechnologies/gsu-alumni-connect" -ForegroundColor Yellow
