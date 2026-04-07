import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getS3BucketName(): string {
  return process.env.S3_BUCKET_IMAGES?.trim() || requiredEnv("NEXT_PUBLIC_S3_BUCKET_IMAGES");
}

export function getS3Endpoint(): string {
  return requiredEnv("AWS_ENDPOINT_URL_S3");
}

function getPublicBucketBaseUrl(): string | null {
  const explicit =
    process.env.S3_PUBLIC_BASE_URL?.trim() || process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL?.trim();
  if (!explicit) return null;
  return explicit.replace(/\/+$/, "");
}

export function buildPublicS3Url(key: string): string {
  const explicitBase = getPublicBucketBaseUrl();
  if (explicitBase) {
    return `${explicitBase}/${key.replace(/^\/+/, "")}`;
  }

  const bucket = getS3BucketName();
  const endpoint = new URL(getS3Endpoint());
  const normalizedKey = key.replace(/^\/+/, "");

  if (endpoint.host.includes("storage.dev")) {
    return `${endpoint.protocol}//${bucket}.${endpoint.host}/${normalizedKey}`;
  }

  const base = endpoint.origin.replace(/\/+$/, "");
  return `${base}/${bucket}/${normalizedKey}`;
}

export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const bucket = getS3BucketName();
    const endpointHost = new URL(getS3Endpoint()).host;
    const explicitBase = getPublicBucketBaseUrl();

    if (parsed.host === `${bucket}.${endpointHost}`) {
      return parsed.pathname.replace(/^\/+/, "");
    }

    if (explicitBase) {
      const explicit = new URL(explicitBase);
      if (parsed.host === explicit.host) {
        return parsed.pathname.replace(/^\/+/, "");
      }
    }

    if (parsed.host.endsWith(".t3.tigrisfiles.io")) {
      return parsed.pathname.replace(/^\/+/, "");
    }

    const bucketPathPrefix = `/${bucket}/`;
    if (parsed.pathname.startsWith(bucketPathPrefix)) {
      return parsed.pathname.slice(bucketPathPrefix.length);
    }

    return null;
  } catch {
    return null;
  }
}

export const S3 = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: getS3Endpoint(),
  credentials: {
    accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
  },
  forcePathStyle: false,
});
