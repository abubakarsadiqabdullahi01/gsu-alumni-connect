import { redisGetJson, redisGetString, redisIncr, redisSetJson } from "@/lib/cache/redis-cache";

const NOTIFICATION_CACHE_TTL_SECONDS = Number.parseInt(
  process.env.NOTIFICATION_CACHE_TTL_SECONDS ?? "10",
  10
);
const NOTIFICATION_VERSION_TTL_SECONDS = Number.parseInt(
  process.env.NOTIFICATION_CACHE_VERSION_TTL_SECONDS ?? "86400",
  10
);

type NotificationScope = "user" | "admin";

function safeSegment(value: string) {
  return encodeURIComponent(value);
}

function versionKey(graduateId: string, scope: NotificationScope) {
  return `notif:v:${scope}:${graduateId}`;
}

function payloadKey(
  graduateId: string,
  scope: NotificationScope,
  version: string,
  page: number,
  pageSize: number,
  status: string,
  q: string
) {
  return `notif:p:${scope}:${graduateId}:v${version}:p${page}:s${pageSize}:st:${safeSegment(status)}:q:${safeSegment(q)}`;
}

export async function readNotificationsCache<T>(
  graduateId: string,
  scope: NotificationScope,
  page: number,
  pageSize: number,
  status: string,
  q: string
): Promise<T | null> {
  const version = (await redisGetString(versionKey(graduateId, scope))) ?? "0";
  return redisGetJson<T>(payloadKey(graduateId, scope, version, page, pageSize, status, q));
}

export async function writeNotificationsCache<T>(
  graduateId: string,
  scope: NotificationScope,
  page: number,
  pageSize: number,
  status: string,
  q: string,
  payload: T
) {
  const version = (await redisGetString(versionKey(graduateId, scope))) ?? "0";
  return redisSetJson(
    payloadKey(graduateId, scope, version, page, pageSize, status, q),
    payload,
    Math.max(1, NOTIFICATION_CACHE_TTL_SECONDS)
  );
}

export async function bumpNotificationsCacheVersion(graduateId: string, scope: NotificationScope) {
  return redisIncr(versionKey(graduateId, scope), Math.max(60, NOTIFICATION_VERSION_TTL_SECONDS));
}
