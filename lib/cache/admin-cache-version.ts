import { redisGetString, redisIncr } from "@/lib/cache/redis-cache";

const ADMIN_CACHE_VERSION_TTL_SECONDS = Math.max(
  300,
  Number.parseInt(process.env.ADMIN_CACHE_VERSION_TTL_SECONDS ?? "604800", 10) || 604800
);

export type AdminCacheScope =
  | "graduates"
  | "groups"
  | "jobs"
  | "mentorship"
  | "network"
  | "achievements";

function versionKey(scope: AdminCacheScope) {
  return `admin:cache:v:${scope}`;
}

export async function getAdminCacheVersion(scope: AdminCacheScope): Promise<string> {
  return (await redisGetString(versionKey(scope))) ?? "0";
}

export async function bumpAdminCacheVersion(scope: AdminCacheScope) {
  return redisIncr(versionKey(scope), ADMIN_CACHE_VERSION_TTL_SECONDS);
}
