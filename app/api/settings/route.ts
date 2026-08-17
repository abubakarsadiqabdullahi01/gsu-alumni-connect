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

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const graduate = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: {
        fullName: true,
        registrationNo: true,
        showCgpa: true,
        showEmail: true,
        showPhone: true,
        showDob: true,
        showInDirectory: true,
        allowMessages: true,
        showActivityFeed: true,
        openToOpportunities: true,
        availableForMentorship: true,
        user: {
          select: {
            accountStatus: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!graduate) {
      return NextResponse.json(
        { error: "Settings not available." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      settings: {
        accountStatus: graduate.user.accountStatus,
        registrationNo: graduate.registrationNo,
        fullName: graduate.fullName,
        email: graduate.user.email,
        phone: graduate.user.phone,
        showCgpa: graduate.showCgpa,
        showEmail: graduate.showEmail,
        showPhone: graduate.showPhone,
        showDob: graduate.showDob,
        showInDirectory: graduate.showInDirectory,
        allowMessages: graduate.allowMessages,
        showActivityFeed: graduate.showActivityFeed,
        openToOpportunities: graduate.openToOpportunities,
        availableForMentorship: graduate.availableForMentorship,
      },
    });
  } catch (error) {
    console.error("[SettingsGet] Error:", error);
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

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
