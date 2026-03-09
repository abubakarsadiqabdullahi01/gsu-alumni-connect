// Load env files in Next.js priority order:
//   .env.local  (highest priority — developer overrides)
//   .env        (project defaults)
// This ensures `pnpm prisma` commands use the SAME DATABASE_URL as the app.
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true }); // .env.local wins
dotenv.config({ override: false });                     // .env as fallback

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    directUrl: process.env["DIRECT_URL"],
  },
});
