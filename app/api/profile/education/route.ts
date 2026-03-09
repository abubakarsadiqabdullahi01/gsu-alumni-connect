import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type EducationPayload = {
  institution?: string;
  degree?: string;
  fieldOfStudy?: string;
  isCurrent?: boolean;
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

    const payload = (await req.json()) as EducationPayload;
    const institution = normalize(payload.institution);
    if (!institution) {
      return NextResponse.json({ error: "Institution is required." }, { status: 400 });
    }

    const graduate = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!graduate) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const education = await prisma.education.create({
      data: {
        graduateId: graduate.id,
        institution,
        degree: normalize(payload.degree),
        fieldOfStudy: normalize(payload.fieldOfStudy),
        isCurrent: payload.isCurrent ?? false,
      },
      select: {
        id: true,
        institution: true,
        degree: true,
        fieldOfStudy: true,
        isCurrent: true,
      },
    });

    return NextResponse.json({ success: true, education });
  } catch (error) {
    console.error("[EducationCreate] Error:", error);
    return NextResponse.json({ error: "Failed to add education." }, { status: 500 });
  }
}

