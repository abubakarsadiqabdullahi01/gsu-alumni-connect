import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

interface CompleteOnboardingBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  profile?: {
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    bio?: string;
    linkedinUrl?: string;
    nyscState?: string;
    nyscYear?: number;
  };
  privacy?: {
    showCgpa?: boolean;
    showEmail?: boolean;
    showPhone?: boolean;
    showDob?: boolean;
    showInDirectory?: boolean;
    allowMessages?: boolean;
    showActivityFeed?: boolean;
    openToOpportunities?: boolean;
    availableForMentorship?: boolean;
  };
}

function normalizeOptionalString(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CompleteOnboardingBody;
    const currentPassword = body.currentPassword?.trim();
    const newPassword = body.newPassword?.trim();
    const confirmPassword = body.confirmPassword?.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Current password, new password, and confirmation are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match." },
        { status: 400 }
      );
    }

    const credentialAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: "credential",
      },
      select: {
        id: true,
        password: true,
      },
    });

    if (!credentialAccount?.password) {
      return NextResponse.json(
        { error: "Credential account not found for this user." },
        { status: 400 }
      );
    }

    const validCurrentPassword = await verifyPassword(
      currentPassword,
      credentialAccount.password
    );

    if (!validCurrentPassword) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    const nextPasswordHash = await hashPassword(newPassword);
    const normalizedProfile = body.profile ?? {};
    const normalizedPrivacy = body.privacy ?? {};

    await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: credentialAccount.id },
        data: { password: nextPasswordHash },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: {
          email: normalizeOptionalString(normalizedProfile.email),
          phone: normalizeOptionalString(normalizedProfile.phone),
          defaultPassword: false,
          accountStatus: "ACTIVE",
        },
      });

      await tx.graduate.update({
        where: { userId: session.user.id },
        data: {
          dateOfBirth: normalizedProfile.dateOfBirth
            ? new Date(normalizedProfile.dateOfBirth)
            : undefined,
          bio: normalizeOptionalString(normalizedProfile.bio),
          linkedinUrl: normalizeOptionalString(normalizedProfile.linkedinUrl),
          nyscState: normalizeOptionalString(normalizedProfile.nyscState),
          nyscYear: normalizedProfile.nyscYear ?? undefined,
          showCgpa: normalizedPrivacy.showCgpa ?? undefined,
          showEmail: normalizedPrivacy.showEmail ?? undefined,
          showPhone: normalizedPrivacy.showPhone ?? undefined,
          showDob: normalizedPrivacy.showDob ?? undefined,
          showInDirectory: normalizedPrivacy.showInDirectory ?? undefined,
          allowMessages: normalizedPrivacy.allowMessages ?? undefined,
          showActivityFeed: normalizedPrivacy.showActivityFeed ?? undefined,
          openToOpportunities: normalizedPrivacy.openToOpportunities ?? undefined,
          availableForMentorship:
            normalizedPrivacy.availableForMentorship ?? undefined,
          profileCompleted: true,
          onboardingStep: 5,
        },
      });

      await tx.activityFeedItem.create({
        data: {
          graduate: { connect: { userId: session.user.id } },
          actionType: "PROFILE_COMPLETED",
          headline: "Completed onboarding and activated account",
          isPublic: false,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const target =
        "meta" in error &&
        typeof error.meta === "object" &&
        error.meta !== null &&
        "target" in error.meta
          ? error.meta.target
          : undefined;

      const fields = Array.isArray(target)
        ? target.map((v) => String(v))
        : target
          ? [String(target)]
          : [];

      if (fields.includes("phone")) {
        return NextResponse.json(
          { error: "This phone number is already used by another account." },
          { status: 409 }
        );
      }

      if (fields.includes("email")) {
        return NextResponse.json(
          { error: "This email is already used by another account." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Some profile fields must be unique. Please use different values." },
        { status: 409 }
      );
    }

    console.error("[OnboardingComplete] Error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
