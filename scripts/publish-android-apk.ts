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

import { exec } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import dotenv from "dotenv";

const run = promisify(exec);

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

/** Newest `apksigner` in the local SDK, or null when the SDK is not installed here. */
function findApksigner(): string | null {
  const sdk =
    process.env.ANDROID_HOME?.trim() ||
    process.env.ANDROID_SDK_ROOT?.trim() ||
    (process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk")
      : path.join(process.env.HOME ?? "", "Android", "Sdk"));

  const buildTools = path.join(sdk, "build-tools");
  if (!existsSync(buildTools)) return null;

  const versions = readdirSync(buildTools).sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true })
  );

  for (const version of versions) {
    for (const name of ["apksigner.bat", "apksigner"]) {
      const candidate = path.join(buildTools, version, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * Which certificate actually signed this APK.
 *
 * Checking for key.properties only proves a file exists; this proves what the
 * build came out signed with, which is the thing that decides whether a future
 * update can install over it.
 */
type SignerCheck =
  | { status: "ok"; debugSigned: boolean; subject: string }
  | { status: "missing" }
  | { status: "failed"; reason: string };

async function readSigner(apk: string): Promise<SignerCheck> {
  const apksigner = findApksigner();
  if (!apksigner) return { status: "missing" };

  // apksigner ships as a .bat on Windows, which only runs through a shell, so
  // this goes out as one quoted command line. A path carrying its own quote
  // would break out of that, so refuse it rather than build the command.
  if (/["\r\n]/.test(apk)) {
    return { status: "failed", reason: "the APK path contains a quote or newline" };
  }

  try {
    const { stdout } = await run(`"${apksigner}" verify --print-certs "${apk}"`, {
      maxBuffer: 4 * 1024 * 1024,
    });
    const subject =
      stdout.match(/Signer #1 certificate DN:\s*(.+)/)?.[1]?.trim() ?? "unknown";
    return {
      status: "ok",
      debugSigned: /CN=Android Debug/i.test(stdout),
      subject,
    };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message.split("\n")[0] : String(error),
    };
  }
}

/** Small enough that a dropped connection costs little, large enough to stay under the 10,000-part cap. */
const PART_SIZE = 8 * 1024 * 1024;
const MAX_ATTEMPTS = 6;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retries a part through the connection drops this upload is expected to hit. */
async function withRetries<T>(label: string, run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (attempt >= MAX_ATTEMPTS) {
        throw new Error(`${label} failed after ${MAX_ATTEMPTS} attempts: ${reason}`);
      }
      const backoff = Math.min(2 ** attempt * 500, 15_000);
      console.log(`  ${label} failed (${reason}) — retrying in ${backoff / 1000}s`);
      await sleep(backoff);
    }
  }
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const dryRun = process.argv.includes("--dry-run");
const allowDebugSignature = process.argv.includes("--allow-debug-signature");
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
  const signer = await readSigner(apkPath);

  if (signer.status === "ok") {
    console.log(`  Signer   ${signer.subject}`);
    if (signer.debugSigned && !allowDebugSignature) {
      throw new Error(
        "this APK is signed with the Android debug key, which every SDK ships.\n" +
          "  Members who install it could never receive a signed update — they would\n" +
          "  have to uninstall and reinstall, losing their session.\n\n" +
          "  Set up the release keystore first: docs/ANDROID_APP_DISTRIBUTION.md\n" +
          "  To publish one anyway, for testing only, pass --allow-debug-signature."
      );
    }
    if (signer.debugSigned) {
      console.warn("\n  WARNING  debug-signed build, published because of --allow-debug-signature.");
      console.warn("           Testing only — this build can never be updated in place.\n");
    }
  } else {
    const why =
      signer.status === "missing"
        ? "apksigner was not found in the Android SDK"
        : `apksigner could not be run (${signer.reason})`;
    console.warn(
      `\n  WARNING  ${why}, so the signature was not checked.\n` +
        (existsSync(path.join("mobile", "android", "key.properties"))
          ? "           key.properties exists, so the build was probably signed correctly.\n"
          : "           key.properties is missing, so this build almost certainly fell\n" +
            "           back to the debug key. See docs/ANDROID_APP_DISTRIBUTION.md.\n")
    );
  }

  if (dryRun) {
    console.log("  --dry-run: nothing uploaded.\n");
    return;
  }

  const {
    AbortMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    CreateMultipartUploadCommand,
    S3Client,
    UploadPartCommand,
  } = await import("@aws-sdk/client-s3");

  const s3 = new S3Client({
    region: process.env.AWS_REGION || "auto",
    endpoint,
    credentials: {
      accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: false,
    requestHandler: { requestTimeout: 0, connectionTimeout: 20_000 },
  });

  // Multipart, sequential, one part at a time. A single 55 MB PUT does not
  // survive the connections this gets published from — it dies with
  // ECONNRESET half way and starts over. Chunked, a reset costs one part.
  const created = await s3.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: "application/vnd.android.package-archive",
      // The key carries the version, so this object never changes again.
      CacheControl: "public, max-age=31536000, immutable",
      ContentDisposition: `attachment; filename="gsu-alumni-connect-v${version}.apk"`,
    })
  );
  const uploadId = created.UploadId;
  if (!uploadId) throw new Error("The bucket did not return an upload id.");

  const partCount = Math.ceil(size / PART_SIZE);
  const parts: { ETag: string; PartNumber: number }[] = [];

  try {
    for (let index = 0; index < partCount; index++) {
      const chunk = body.subarray(index * PART_SIZE, (index + 1) * PART_SIZE);
      const partNumber = index + 1;

      const eTag = await withRetries(
        `part ${partNumber}/${partCount}`,
        async () => {
          const part = await s3.send(
            new UploadPartCommand({
              Bucket: bucket,
              Key: key,
              UploadId: uploadId,
              PartNumber: partNumber,
              Body: chunk,
              ContentLength: chunk.length,
            })
          );
          if (!part.ETag) throw new Error("no ETag returned");
          return part.ETag;
        }
      );

      parts.push({ ETag: eTag, PartNumber: partNumber });
      console.log(`  uploaded part ${partNumber}/${partCount} (${formatSize(chunk.length)})`);
    }

    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })
    );
  } catch (error) {
    // Leaving an incomplete upload behind bills for the parts already stored.
    await s3
      .send(
        new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId })
      )
      .catch(() => {});
    throw error;
  }

  console.log(`\n  Done: ${url}\n`);
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
