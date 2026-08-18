import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAlumniInsights } from "@/lib/insights/alumni-insights";

/**
 * Member-safe platform insights for dashboards and charts, on web and mobile.
 *
 * Distinct from the admin analytics endpoints: everything returned here is an
 * aggregate count, so an ordinary member can read it without being handed
 * per-person records, salaries or contact details.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insights = await getAlumniInsights();
    return NextResponse.json(insights);
  } catch (error) {
    console.error("[InsightsAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to load alumni insights." },
      { status: 500 }
    );
  }
}
