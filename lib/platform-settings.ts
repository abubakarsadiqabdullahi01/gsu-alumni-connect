import { prisma } from "@/lib/db";

export const DEFAULT_ADMIN_SETTINGS = {
  platformName: "GSU Alumni Connect",
  supportEmail: "alumni@gsu.edu.ng",
  welcomeMessage: "Welcome to GSU Alumni Connect! Complete your profile to get started.",
  allowSelfRegistration: false,
  requireEmailVerification: true,
  forcePasswordChangeOnFirst: true,
  enableTwoFactor: true,
  featureJobBoard: true,
  featureMentorship: true,
  featureMessaging: true,
  featureMap: true,
  featureGroups: true,
  featureSkills: false,
} as const;

export type FeatureFlagKey =
  | "featureJobBoard"
  | "featureMentorship"
  | "featureMessaging"
  | "featureMap"
  | "featureGroups"
  | "featureSkills";

export async function getOrCreateAdminSettings() {
  return prisma.adminSetting.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      ...DEFAULT_ADMIN_SETTINGS,
    },
    update: {},
  });
}

export async function isFeatureEnabled(feature: FeatureFlagKey) {
  const settings = await getOrCreateAdminSettings();
  return Boolean(settings[feature]);
}

