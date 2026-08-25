import { NextRequest, NextResponse } from "next/server";
import { ANDROID_APP, getAndroidApkUrl } from "@/lib/app-download";

/**
 * Hands the visitor the Android build.
 *
 * A redirect rather than a proxy: the APK is tens of megabytes, and streaming
 * it through a serverless function would burn function time and bandwidth on
 * every install for no gain — the bucket already serves ranged requests and
 * resumes, which matters on the connections most of our members are on.
 */
export async function GET(request: NextRequest) {
  const target = getAndroidApkUrl();

  if (!target) {
    return NextResponse.json(
      {
        error:
          "The Android app has not been published yet. Please use the web app in the meantime.",
      },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const response = NextResponse.redirect(new URL(target, request.nextUrl.origin), 307);
  // Never cache the hop itself, so publishing a new build takes effect at once.
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-App-Version", ANDROID_APP.version);
  return response;
}
