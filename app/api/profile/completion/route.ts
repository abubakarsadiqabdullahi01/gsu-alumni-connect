import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProfileCompletion } from "@/lib/profile/completion";

/**
 * Profile completion for the signed-in member.
 *
 * Returns the per-section breakdown as well as the percentage, so a client can
 * render a checklist and a single "do this next" prompt without hard-coding
 * what counts as complete.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const completion = await getProfileCompletion(session.user.id);
    if (!completion) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    return NextResponse.json(completion);
  } catch (error) {
    console.error("[ProfileCompletionAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to load profile completion." },
      { status: 500 }
    );
  }
}
