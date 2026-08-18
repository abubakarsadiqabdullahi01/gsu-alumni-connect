import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAlumniGeography } from "@/lib/map/alumni-geography";
import { isFeatureEnabled } from "@/lib/platform-settings";

/**
 * Alumni geography for the Android map screen.
 *
 * Shares lib/map/alumni-geography with the web map page, so the visibility
 * rules and aggregation cannot drift between platforms.
 *
 * The response is aggregate-only. It deliberately no longer carries the
 * per-person `points` array, which exposed every alumnus's full name and
 * precise coordinates to any signed-in member. The mobile bubble map already
 * draws from `states`, so nothing on the client needs those rows.
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("featureMap"))) {
      return NextResponse.json(
        { error: "Map feature is disabled by admin." },
        { status: 403 }
      );
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const geography = await getAlumniGeography();
    return NextResponse.json(geography);
  } catch (error) {
    console.error("[MapAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to load alumni map data." },
      { status: 500 }
    );
  }
}
