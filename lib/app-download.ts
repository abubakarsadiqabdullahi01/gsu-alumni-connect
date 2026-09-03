/**
 * Single source of truth for the Android build the landing page hands out.
 *
 * The APK is never committed. A release build is 20–57 MB, and anything in
 * `public/` rides along in every clone and every Vercel deployment, so the
 * binary lives in the same bucket the app already uses for images — see
 * `scripts/publish-android-apk.ts` — and only its URL comes in through the
 * environment.
 *
 * `NEXT_PUBLIC_ANDROID_APK_URL` takes either an absolute URL or a site-relative
 * path (e.g. `/downloads/gsu-alumni-connect.apk`), so dropping a build into
 * `public/downloads` still works while developing. When it is unset the landing
 * page says the app is not out yet instead of offering a link that 404s.
 */

export const ANDROID_APP = {
  packageId: "com.gsualumni.connect",
  /** Mirrors `version:` in mobile/pubspec.yaml. */
  version: process.env.NEXT_PUBLIC_ANDROID_APP_VERSION?.trim() || "0.1.0",
  /** Display-only, e.g. "21 MB". Left blank when nobody set it. */
  sizeLabel: process.env.NEXT_PUBLIC_ANDROID_APK_SIZE?.trim() || "",
  /** minSdk 24 — see mobile/build/app/outputs/apk/release/output-metadata.json. */
  minAndroidVersion: "7.0",
  /**
   * The one link we hand out: on the landing page, in the QR code, in emails.
   * It redirects, so moving the binary to another bucket — or to a Play Store
   * listing later — never invalidates a link already in the wild.
   */
  downloadPath: "/api/download/android",
} as const;

/** The configured APK location, or null when no build has been published. */
export function getAndroidApkUrl(): string | null {
  return process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() || null;
}

export function isAndroidAppAvailable(): boolean {
  return getAndroidApkUrl() !== null;
}

/** Absolute URL for the QR code. Falls back to the caller's own origin. */
export function buildAndroidDownloadUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${ANDROID_APP.downloadPath}`;
}
