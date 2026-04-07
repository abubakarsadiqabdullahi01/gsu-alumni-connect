import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function isAllowedImageHost(host: string): boolean {
  return (
    host.endsWith(".t3.tigrisfiles.io") ||
    host.endsWith(".storage.dev") ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = request.nextUrl.searchParams.get("src");
  if (!source) {
    return NextResponse.json({ error: "Missing src parameter." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(source);
  } catch {
    return NextResponse.json({ error: "Invalid source URL." }, { status: 400 });
  }

  if (!isAllowedImageHost(target.hostname)) {
    return NextResponse.json({ error: "Source host is not allowed." }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), { cache: "force-cache" });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Failed to fetch source image." }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Source is not an image." }, { status: 400 });
    }

    const bytes = await upstream.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("[IdCardImageProxy] Error:", error);
    return NextResponse.json({ error: "Image proxy failed." }, { status: 500 });
  }
}

