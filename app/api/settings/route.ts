import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type SettingsPayload = {
  showCgpa?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  showDob?: boolean;
  showInDirectory?: boolean;
  allowMessages?: boolean;
  showActivityFeed?: boolean;
  openToOpportunities?: boolean;
  availableForMentorship?: boolean;
};

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await req.json()) as SettingsPayload;

    await prisma.graduate.update({
      where: { userId: session.user.id },
      data: {
        showCgpa: payload.showCgpa ?? undefined,
        showEmail: payload.showEmail ?? undefined,
        showPhone: payload.showPhone ?? undefined,
        showDob: payload.showDob ?? undefined,
        showInDirectory: payload.showInDirectory ?? undefined,
        allowMessages: payload.allowMessages ?? undefined,
        showActivityFeed: payload.showActivityFeed ?? undefined,
        openToOpportunities: payload.openToOpportunities ?? undefined,
        availableForMentorship: payload.availableForMentorship ?? undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SettingsUpdate] Error:", error);
    return NextResponse.json({ error: "Failed to update settings." }, { status: 500 });
  }
}

