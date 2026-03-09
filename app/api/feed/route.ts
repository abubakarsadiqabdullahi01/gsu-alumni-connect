import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_ACTION_TYPES = new Set([
  "UPDATED_JOB",
  "POSTED_JOB",
  "JOINED_GROUP",
  "POSTED_IN_GROUP",
  "GRADUATION_ANNIVERSARY",
]);

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "admin";
    const graduate = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!isAdmin && !graduate) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const feed = await prisma.activityFeedItem.findMany({
      where: isAdmin
        ? undefined
        : {
            graduateId: graduate!.id,
          },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        actionType: true,
        headline: true,
        isPublic: true,
        createdAt: true,
        graduateId: true,
        graduate: {
          select: {
            fullName: true,
            departmentName: true,
            user: { select: { image: true } },
          },
        },
      },
    });

    return NextResponse.json({ feed });
  } catch (error) {
    console.error("[FeedGet] Error:", error);
    return NextResponse.json({ error: "Failed to load feed." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const graduate = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!graduate) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const body = (await req.json()) as {
      headline?: string;
      actionType?: string;
      isPublic?: boolean;
    };

    const headline = body.headline?.trim() ?? "";
    const actionType = body.actionType?.trim() ?? "";
    const isPublic = body.isPublic ?? true;

    if (headline.length < 8) {
      return NextResponse.json({ error: "Headline must be at least 8 characters." }, { status: 400 });
    }
    if (headline.length > 240) {
      return NextResponse.json({ error: "Headline is too long." }, { status: 400 });
    }
    if (!ALLOWED_ACTION_TYPES.has(actionType)) {
      return NextResponse.json({ error: "Invalid activity type." }, { status: 400 });
    }

    const created = await prisma.activityFeedItem.create({
      data: {
        graduateId: graduate.id,
        actionType: actionType as
          | "UPDATED_JOB"
          | "POSTED_JOB"
          | "JOINED_GROUP"
          | "POSTED_IN_GROUP"
          | "GRADUATION_ANNIVERSARY",
        headline,
        isPublic,
      },
      select: {
        id: true,
        actionType: true,
        headline: true,
        isPublic: true,
        createdAt: true,
        graduateId: true,
        graduate: {
          select: {
            fullName: true,
            departmentName: true,
            user: { select: { image: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, item: created });
  } catch (error) {
    console.error("[FeedPost] Error:", error);
    return NextResponse.json({ error: "Failed to create activity update." }, { status: 500 });
  }
}
