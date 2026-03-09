import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_ADMIN_SETTINGS } from "@/lib/platform-settings";

const DEFAULT_SETTINGS = DEFAULT_ADMIN_SETTINGS;

async function requireAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const settings = await prisma.adminSetting.upsert({
      where: { id: "main" },
      create: {
        id: "main",
        ...DEFAULT_SETTINGS,
      },
      update: {},
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[AdminSettingsAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load admin settings." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const payload = (await request.json()) as Partial<typeof DEFAULT_SETTINGS>;

    const settings = await prisma.adminSetting.upsert({
      where: { id: "main" },
      create: {
        id: "main",
        ...DEFAULT_SETTINGS,
        ...payload,
      },
      update: {
        platformName: payload.platformName ?? undefined,
        supportEmail: payload.supportEmail ?? undefined,
        welcomeMessage: payload.welcomeMessage ?? undefined,
        allowSelfRegistration: payload.allowSelfRegistration ?? undefined,
        requireEmailVerification: payload.requireEmailVerification ?? undefined,
        forcePasswordChangeOnFirst: payload.forcePasswordChangeOnFirst ?? undefined,
        enableTwoFactor: payload.enableTwoFactor ?? undefined,
        featureJobBoard: payload.featureJobBoard ?? undefined,
        featureMentorship: payload.featureMentorship ?? undefined,
        featureMessaging: payload.featureMessaging ?? undefined,
        featureMap: payload.featureMap ?? undefined,
        featureGroups: payload.featureGroups ?? undefined,
        featureSkills: payload.featureSkills ?? undefined,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[AdminSettingsAPI][PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to save admin settings." }, { status: 500 });
  }
}
