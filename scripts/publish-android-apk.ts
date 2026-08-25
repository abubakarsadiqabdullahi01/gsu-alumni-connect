#!/usr/bin/env tsx
/**
 * Publishes an Android release build to the S3 bucket the web app already uses,
 * and prints the environment lines the landing page needs.
 *
 * The APK stays out of git on purpose: a release build is 20-57 MB, and a
 * binary that large in `public/` rides along in every clone and every Vercel
 * deployment. The landing page only ever holds a URL.
 *
 *   pnpm app:publish-apk
 *   pnpm app:publish-apk -- --file mobile/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
 *   pnpm app:publish-apk -- --dry-run
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const DEFAULT_APK = path.join(
  "mobile",
  "build",
  "app",
  "outputs",
  "flutter-apk",
  "app-release.apk"
);

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const dryRun = process.argv.includes("--dry-run");
const apkPath = arg("file") ?? DEFAULT_APK;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/** `version: 0.1.0+1` in mobile/pubspec.yaml -> { version: "0.1.0", build: "1" } */
function readPubspecVersion(): { version: string; build: string } {
  const pubspec = readFileSync(path.join("mobile", "pubspec.yaml"), "utf8");
  const match = pubspec.match(/^version:\s*([0-9]+\.[0-9]+\.[0-9]+)(?:\+(\d+))?/m);
  if (!match) throw new Error("Could not read `version:` from mobile/pubspec.yaml");
  return { version: match[1], build: match[2] ?? "1" };
}

function publicUrlFor(key: string, bucket: string, endpoint: string): string {
  const explicitBase =
    process.env.S3_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL?.trim();
  if (explicitBase) return `${explicitBase.replace(/\/+$/, "")}/${key}`;

  const url = new URL(endpoint);
  if (url.host.includes("storage.dev")) {
    return `${url.protocol}//${bucket}.${url.host}/${key}`;
  }
  return `${url.origin.replace(/\/+$/, "")}/${bucket}/${key}`;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

async function main() {
  if (!existsSync(apkPath)) {
    throw new Error(
      `No APK at ${apkPath}. Build one first:\n` +
        `  cd mobile && flutter build apk --release --split-per-abi`
    );
  }

  const { version, build } = readPubspecVersion();
  const size = statSync(apkPath).size;
  const body = readFileSync(apkPath);
  const sha256 = createHash("sha256").update(body).digest("hex");

  const variant = path.basename(apkPath).replace(/^app-|-?release\.apk$/g, "") || "universal";
  const key = `app/android/gsu-alumni-connect-v${version}-${build}${
    variant === "universal" ? "" : `-${variant}`
  }.apk`;

  const bucket =
    process.env.S3_BUCKET_IMAGES?.trim() || requiredEnv("NEXT_PUBLIC_S3_BUCKET_IMAGES");
  const endpoint = requiredEnv("AWS_ENDPOINT_URL_S3");
  const url = publicUrlFor(key, bucket, endpoint);

  console.log("");
  console.log(`  File     ${apkPath}`);
  console.log(`  Version  ${version} (build ${build})`);
  console.log(`  Size     ${formatSize(size)}`);
  console.log(`  SHA-256  ${sha256}`);
  console.log(`  Bucket   ${bucket}`);
  console.log(`  Key      ${key}`);
  console.log("");

  // A debug-signed APK must never reach members: the debug key ships with every
  // Android SDK, and Android refuses to update an app with a differently signed
  // build, so everyone would have to uninstall and lose their session.
  if (!existsSync(path.join("mobile", "android", "key.properties"))) {
    console.warn(
      "  WARNING  mobile/android/key.properties is missing, so this build was\n" +
        "           signed with the debug key. Do not publish it to members —\n" +
        "           set up the release keystore and rebuild first.\n"
    );
  }

  if (dryRun) {
    console.log("  --dry-run: nothing uploaded.\n");
    return;
  }

  const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: process.env.AWS_REGION || "auto",
    endpoint,
    credentials: {
      accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: false,
  });

  console.log("  Uploading...");
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentLength: size,
      ContentType: "application/vnd.android.package-archive",
      // The key carries the version, so this object never changes again.
      CacheControl: "public, max-age=31536000, immutable",
      ContentDisposition: `attachment; filename="gsu-alumni-connect-v${version}.apk"`,
    })
  );

  console.log(`  Done: ${url}\n`);
  console.log("  Set these on Vercel (and in .env.local for a local check):\n");
  console.log(`NEXT_PUBLIC_ANDROID_APK_URL=${url}`);
  console.log(`NEXT_PUBLIC_ANDROID_APP_VERSION=${version}`);
  console.log(`NEXT_PUBLIC_ANDROID_APK_SIZE=${formatSize(size)}`);
  console.log("");
  console.log("  Redeploy afterwards — NEXT_PUBLIC_* values are baked in at build time.\n");
}

main().catch((error) => {
  console.error(`\n  Failed: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
