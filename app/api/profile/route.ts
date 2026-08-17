import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type ProfilePayload = {
  email?: string;
  phone?: string;
  dateOfBirth?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  githubUrl?: string | null;
  personalWebsite?: string | null;
  nyscState?: string | null;
  nyscYear?: number | null;
  openToOpportunities?: boolean;
  availableForMentorship?: boolean;
};

function normalizeOptionalString(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asDateInput(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

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
        departmentName: true,
        facultyName: true,
        graduationYear: true,
        degreeClass: true,
        dateOfBirth: true,
        bio: true,
        linkedinUrl: true,
        twitterUrl: true,
        githubUrl: true,
        personalWebsite: true,
        nyscState: true,
        nyscYear: true,
        openToOpportunities: true,
        availableForMentorship: true,
        employment: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
            employmentType: true,
            isCurrent: true,
          },
        },
        education: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            institution: true,
            degree: true,
            fieldOfStudy: true,
            isCurrent: true,
          },
        },
        skills: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            skillName: true,
            proficiency: true,
          },
        },
        user: {
          select: {
            accountStatus: true,
            email: true,
            phone: true,
            image: true,
          },
        },
        signatureUrl: true,
      },
    });

    if (!graduate) {
      return NextResponse.json(
        { error: "Profile not available." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      profile: {
        fullName: graduate.fullName,
        registrationNo: graduate.registrationNo,
        departmentName: graduate.departmentName,
        facultyName: graduate.facultyName,
        graduationYear: graduate.graduationYear,
        degreeClass: graduate.degreeClass,
        accountStatus: graduate.user.accountStatus,
        email: graduate.user.email,
        phone: graduate.user.phone,
        avatarUrl: graduate.user.image,
        signatureUrl: graduate.signatureUrl,
        dateOfBirth: asDateInput(graduate.dateOfBirth),
        bio: graduate.bio,
        linkedinUrl: graduate.linkedinUrl,
        twitterUrl: graduate.twitterUrl,
        githubUrl: graduate.githubUrl,
        personalWebsite: graduate.personalWebsite,
        nyscState: graduate.nyscState,
        nyscYear: graduate.nyscYear,
        openToOpportunities: graduate.openToOpportunities,
        availableForMentorship: graduate.availableForMentorship,
        employment: graduate.employment,
        education: graduate.education,
        skills: graduate.skills,
      },
    });
  } catch (error) {
    console.error("[ProfileGet] Error:", error);
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await req.json()) as ProfilePayload;

    const email = normalizeOptionalString(payload.email);
    const phone = normalizeOptionalString(payload.phone);
    const dateOfBirthInput = payload.dateOfBirth;
    const dateOfBirth =
      dateOfBirthInput === undefined
        ? undefined
        : dateOfBirthInput === null || dateOfBirthInput.trim() === ""
          ? null
          : new Date(dateOfBirthInput);

    if (dateOfBirth instanceof Date && Number.isNaN(dateOfBirth.getTime())) {
      return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });
    }

    if (payload.nyscYear !== undefined && payload.nyscYear !== null) {
      if (!Number.isInteger(payload.nyscYear) || payload.nyscYear < 1980 || payload.nyscYear > 2100) {
        return NextResponse.json({ error: "Invalid NYSC year." }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          email,
          phone,
        },
      });

      await tx.graduate.update({
        where: { userId: session.user.id },
        data: {
          dateOfBirth,
          bio: normalizeOptionalString(payload.bio),
          linkedinUrl: normalizeOptionalString(payload.linkedinUrl),
          twitterUrl: normalizeOptionalString(payload.twitterUrl),
          githubUrl: normalizeOptionalString(payload.githubUrl),
          personalWebsite: normalizeOptionalString(payload.personalWebsite),
          nyscState: normalizeOptionalString(payload.nyscState),
          nyscYear: payload.nyscYear ?? null,
          openToOpportunities: payload.openToOpportunities ?? undefined,
          availableForMentorship: payload.availableForMentorship ?? undefined,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "Email or phone is already used by another account." },
        { status: 409 }
      );
    }

    console.error("[ProfileUpdate] Error:", error);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
