# Unlink from old Vercel project
# This removes the .vercel folder that links to "alumni-system"

Write-Host "🔓 Unlinking from old Vercel project..." -ForegroundColor Cyan

if (Test-Path ".vercel") {
    Remove-Item -Recurse -Force .vercel
    Write-Host "✅ Unlinked! The .vercel folder has been removed." -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run: pnpm dlx vercel" -ForegroundColor White
    Write-Host "2. When asked 'Link to existing project?', choose NO" -ForegroundColor White
    Write-Host "3. Give it a new name: gsu-alumni-connect" -ForegroundColor White
    Write-Host "4. Add environment variables in Vercel Dashboard" -ForegroundColor White
    Write-Host "5. Deploy to production: pnpm dlx vercel --prod" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 See UNLINK_AND_REDEPLOY.md for detailed instructions" -ForegroundColor Cyan
} else {
    Write-Host "ℹ️  No .vercel folder found. Project is already unlinked." -ForegroundColor Gray
}
