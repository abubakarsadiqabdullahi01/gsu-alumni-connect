import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/platform-settings";

/**
 * Nigeria LGA boundary polygons, proxied and cached.
 *
 * The map used to fetch this straight from a GitHub raw URL in the browser on
 * every mount, which made a third party a hard runtime dependency of a
 * production page. Serving it from our own origin means one upstream fetch per
 * revalidation window instead of one per visitor, and a failure we can report
 * to the user instead of a silently blank map.
 */
const UPSTREAM =
  "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/NGA/ADM2/geoBoundaries-NGA-ADM2_simplified.geojson";

const ONE_DAY_SECONDS = 86_400;

export const revalidate = 86_400;

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

    const upstream = await fetch(UPSTREAM, {
      next: { revalidate: ONE_DAY_SECONDS },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Boundary data is unavailable." },
        { status: 502 }
      );
    }

    // Streamed through as text: parsing it here would only cost memory, since
    // the client re-parses it anyway.
    const body = await upstream.text();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": `public, max-age=${ONE_DAY_SECONDS}, stale-while-revalidate=604800`,
      },
    });
  } catch (error) {
    console.error("[MapBoundariesAPI] Error:", error);
    return NextResponse.json(
      { error: "Boundary data is unavailable." },
      { status: 502 }
    );
  }
}
