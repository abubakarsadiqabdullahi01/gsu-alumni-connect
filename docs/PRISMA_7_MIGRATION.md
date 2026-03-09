# Prisma 7.x Migration - What Changed

## The Issue
Prisma 7.x no longer allows `url` in the `datasource` block in `schema.prisma`.

## The Fix

### 1. schema.prisma
**Before (Prisma 6.x):**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**After (Prisma 7.x):**
```prisma
datasource db {
  provider = "postgresql"
}
```

### 2. prisma.config.ts
**Added datasource configuration:**
```typescript
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasources: {
    db: {
      url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
    },
  },
});
```

### 3. lib/db.ts (Already Correct)
Runtime connection using adapter:
```typescript
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

## How It Works Now

1. **Prisma CLI commands** (generate, migrate, etc.) read URL from `prisma.config.ts`
2. **Runtime connections** use adapter pattern in `lib/db.ts`
3. **Schema file** only defines the provider type

## References
- https://pris.ly/d/config-datasource
- https://pris.ly/d/prisma7-client-config
