@echo off
REM Deploy cron fix - Step 3 from the user's instructions

echo.
echo ================== CRON FIX DEPLOYMENT ==================
echo.
echo Step 1: Stage the changes
git add app/api/import-jobs/route.ts
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to stage changes
    exit /b 1
)

echo Step 2: Commit with message
git commit -m "fix: use correct app URL for cron self-trigger"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to commit
    exit /b 1
)

echo Step 3: Push to remote
git push
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to push
    exit /b 1
)

echo.
echo ================== DEPLOYMENT SUMMARY ==================
echo.
echo Changes committed and pushed successfully!
echo.
echo NEXT STEPS:
echo 1. Go to Vercel dashboard for your project
echo 2. Settings ^> Environment Variables
echo 3. Update/add these variables:
echo    - NEXT_PUBLIC_APP_URL = https://www.gsualumni.org.ng
echo    - BETTER_AUTH_URL = https://www.gsualumni.org.ng
echo    - CRON_SECRET = ^<any random string^>
echo 4. Wait for the deployment to complete
echo 5. Verify logs show:
echo    - POST 201  /api/import-jobs
echo    - GET  200  /api/cron/process-import (self-trigger)
echo    - GET  200  /api/cron/process-import (cron backup at 60s)
echo.
echo ========================================================
echo.
