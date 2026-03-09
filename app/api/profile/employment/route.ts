import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type EmploymentPayload = {
  jobTitle?: string;
  companyName?: string;
  employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "SELF_EMPLOYED" | "UNEMPLOYED" | "STUDENT";
  isCurrent?: boolean;
};

function nonEmpty(value: string | undefined): string | null {
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

    const payload = (await req.json()) as EmploymentPayload;
    const jobTitle = nonEmpty(payload.jobTitle);
    const companyName = nonEmpty(payload.companyName);

    if (!jobTitle || !companyName) {
      return NextResponse.json({ error: "Job title and company name are required." }, { status: 400 });
    }

    const graduate = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!graduate) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const employment = await prisma.employment.create({
      data: {
        graduateId: graduate.id,
        jobTitle,
        companyName,
        employmentType: payload.employmentType ?? "FULL_TIME",
        isCurrent: payload.isCurrent ?? false,
      },
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        employmentType: true,
        isCurrent: true,
      },
    });

    return NextResponse.json({ success: true, employment });
  } catch (error) {
    console.error("[EmploymentCreate] Error:", error);
    return NextResponse.json({ error: "Failed to add employment." }, { status: 500 });
  }
}

