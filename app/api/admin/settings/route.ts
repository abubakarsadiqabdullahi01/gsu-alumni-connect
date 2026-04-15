import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isSessionOk } from "@/lib/api-middleware";
import { DEFAULT_ADMIN_SETTINGS } from "@/lib/platform-settings";

const DEFAULT_SETTINGS = DEFAULT_ADMIN_SETTINGS;

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request.headers, "AdminSettingsAPI");
    if (!isSessionOk(result)) return result.error;

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
    const result = await requireAdmin(request.headers, "AdminSettingsAPI");
    if (!isSessionOk(result)) return result.error;

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
    return NextResponse.json({ error: "Failed to update admin settings." }, { status: 500 });
  }
}
