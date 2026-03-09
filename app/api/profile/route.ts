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

