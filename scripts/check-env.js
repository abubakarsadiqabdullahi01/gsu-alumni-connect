#!/usr/bin/env node

// This script helps debug Vercel build issues by checking environment

console.log('=== Vercel Build Environment Check ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DIRECT_URL exists:', !!process.env.DIRECT_URL);
console.log('BETTER_AUTH_SECRET exists:', !!process.env.BETTER_AUTH_SECRET);
console.log('BETTER_AUTH_URL:', process.env.BETTER_AUTH_URL);
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log('VERCEL:', process.env.VERCEL);
console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
console.log('======================================');
