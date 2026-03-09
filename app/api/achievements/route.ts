import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const BADGE_CATALOG = [
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

const MIN_YEAR = 1980;
const MAX_YEAR = 2100;

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const params = req.nextUrl.searchParams;
    const q = (params.get("q") ?? "").trim();
    const verified = (params.get("verified") ?? "all").trim();
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(20, Math.max(6, Number.parseInt(params.get("pageSize") ?? "10", 10) || 10));
    const skip = (page - 1) * pageSize;

    const where = {
      graduateId: me.id,
      ...(verified === "verified" ? { verified: true } : {}),
      ...(verified === "pending" ? { verified: false } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [achievements, total, allCount, verifiedCount, awardedBadges] = await Promise.all([
      prisma.achievement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          description: true,
          year: true,
          verified: true,
          verifiedAt: true,
          createdAt: true,
        },
      }),
      prisma.achievement.count({ where }),
      prisma.achievement.count({ where: { graduateId: me.id } }),
      prisma.achievement.count({ where: { graduateId: me.id, verified: true } }),
      prisma.profileBadge.findMany({
        where: { graduateId: me.id },
        orderBy: [{ awardedAt: "desc" }],
        select: {
          badgeType: true,
          awardedAt: true,
        },
      }),
    ]);

    const awardedMap = new Map(awardedBadges.map((b) => [b.badgeType, b.awardedAt]));
    const badges = BADGE_CATALOG.map((item) => ({
      ...item,
      locked: !awardedMap.has(item.badgeType),
      awardedAt: awardedMap.get(item.badgeType) ?? null,
    }));

    const earnedBadges = badges.filter((b) => !b.locked).length;

    return NextResponse.json({
      achievements,
      badges,
      stats: {
        totalAchievements: allCount,
        verifiedAchievements: verifiedCount,
        pendingAchievements: Math.max(0, allCount - verifiedCount),
        earnedBadges,
        lockedBadges: badges.length - earnedBadges,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[AchievementsAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load achievements." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      year?: number | null;
    };

    const title = (body.title ?? "").trim();
    const description = (body.description ?? "").trim();
    const year = body.year ?? null;

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    if (year !== null && (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR)) {
      return NextResponse.json({ error: `Year must be between ${MIN_YEAR} and ${MAX_YEAR}.` }, { status: 400 });
    }

    const achievement = await prisma.achievement.create({
      data: {
        graduateId: me.id,
        title,
        description: description || null,
        year,
      },
      select: {
        id: true,
        title: true,
        description: true,
        year: true,
        verified: true,
        verifiedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ achievement }, { status: 201 });
  } catch (error) {
    console.error("[AchievementsAPI][POST] Error:", error);
    return NextResponse.json({ error: "Failed to create achievement." }, { status: 500 });
  }
}

