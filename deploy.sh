#!/bin/bash

# Commit all changes and push to trigger Vercel deployment

echo "📝 Committing all changes..."

git add .

git commit -m "fix: UTF-8 encoding issues and prepare for Vercel deployment

- Fix invalid UTF-8 characters in admin-job-detail-client.tsx
- Update lib/db.ts to support Neon SSL connections
- Add postinstall script for Prisma client generation
- Add admin setup script with DIRECT_URL support
- Add comprehensive deployment documentation
- Unlink from old Vercel project"

echo "🚀 Pushing to GitHub..."

git push origin main

echo "✅ Done! Vercel will automatically deploy the new build."
echo "📊 Monitor deployment at: https://vercel.com/humsadtechnologies/gsu-alumni-connect"
