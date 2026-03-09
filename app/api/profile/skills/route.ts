import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type SkillsPayload = {
  skillName?: string;
  proficiency?: "BEGINNER" | "INTERMEDIATE" | "EXPERT";
};

function normalize(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await req.json()) as SkillsPayload;
    const skillName = normalize(payload.skillName);
    if (!skillName) {
      return NextResponse.json({ error: "Skill name is required." }, { status: 400 });
    }

    const graduate = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!graduate) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const skill = await prisma.skill.create({
      data: {
        graduateId: graduate.id,
        skillName,
        proficiency: payload.proficiency ?? "INTERMEDIATE",
      },
      select: {
        id: true,
        skillName: true,
        proficiency: true,
      },
    });

    return NextResponse.json({ success: true, skill });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Skill already exists." }, { status: 409 });
    }
    console.error("[SkillCreate] Error:", error);
    return NextResponse.json({ error: "Failed to add skill." }, { status: 500 });
  }
}

