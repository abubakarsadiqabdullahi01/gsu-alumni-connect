/**
 * Badge presentation, shared by every endpoint that returns badges.
 *
 * Lived inside app/api/achievements/route.ts until the public alumni profile
 * needed the same labels; a second copy would have let the two drift.
 */
export const BADGE_CATALOG = [
  {
    badgeType: "PROFILE_COMPLETE",
    label: "Profile Complete",
    description: "Complete your profile details to 100%.",
    icon: "shield-check",
  },
  {
    badgeType: "EARLY_ADOPTER",
    label: "Early Adopter",
    description: "Joined the platform in the early launch cohort.",
    icon: "rocket",
  },
  {
    badgeType: "FIRST_CLASS_HONOURS",
    label: "First Class Honours",
    description: "Awarded for graduating with first class honors.",
    icon: "award",
  },
  {
    badgeType: "MENTOR",
    label: "Mentor",
    description: "Actively supports alumni through mentorship.",
    icon: "graduation-cap",
  },
  {
    badgeType: "JOB_POSTER",
    label: "Job Poster",
    description: "Published high-impact job opportunities.",
    icon: "briefcase",
  },
  {
    badgeType: "TOP_CONNECTOR",
    label: "Top Connector",
    description: "Highly active in building alumni connections.",
    icon: "users",
  },
  {
    badgeType: "VERIFIED",
    label: "Verified",
    description: "Verified status granted by administrators.",
    icon: "badge-check",
  },
] as const;

export type BadgeCatalogEntry = (typeof BADGE_CATALOG)[number];

const BY_TYPE = new Map<string, BadgeCatalogEntry>(
  BADGE_CATALOG.map((entry) => [entry.badgeType, entry])
);

/**
 * Presentation for an awarded badge. Unknown types still render as something
 * readable rather than a blank chip, since the enum can gain members before
 * this catalog catches up.
 */
export function describeBadge(badgeType: string) {
  const entry = BY_TYPE.get(badgeType);
  return {
    badgeType,
    label: entry?.label ?? badgeType.replace(/_/g, " ").toLowerCase(),
    description: entry?.description ?? "",
    icon: entry?.icon ?? "award",
  };
}
