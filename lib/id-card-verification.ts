import "server-only";

import { prisma } from "@/lib/db";
import { verifyCardSignature, verifyVerificationQuery } from "@/lib/id-card-security";

/**
 * Resolving a scanned ID card, shared by the public page and the public API.
 *
 * They used to resolve it separately, and drifted: the page formatted the
 * degree class and masked the membership number, the API returned `FIRST_CLASS`
 * and the number in full. One resolver, one answer.
 */

export type CardVerificationStatus = "valid" | "expired" | "revoked" | "invalid";

export type CardVerification = {
  status: CardVerificationStatus;
  verified: boolean;
  reason: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  data: {
    cardId: string;
    alumniNumber: string;
    fullName: string;
    stateOfOrigin: string;
    graduationYear: string;
    discipline: string;
    gender: "Male" | "Female" | "Unknown";
    rank: string;
  } | null;
};

export type CardVerificationParams = {
  cardId: string;
  signature: string;
  /** Legacy query parameters, kept so QR codes printed before the fix still answer. */
  legacyAlumniNumber?: string;
  legacyExpiresAtUnix?: number;
};

function formatDegreeClass(value: string | null): string {
  if (!value) return "Alumni Member";
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0) + chunk.slice(1).toLowerCase())
    .join(" ");
}

function fail(status: CardVerificationStatus, reason: string): CardVerification {
  return { status, verified: false, reason, issuedAt: null, expiresAt: null, data: null };
}

export async function resolveCardVerification(
  params: CardVerificationParams
): Promise<CardVerification> {
  const { cardId, signature } = params;

  if (!cardId || !signature) {
    return fail("invalid", "Missing verification parameters.");
  }

  // ── Cards printed under the old scheme ────────────────────────────────────
  // Their signature covered a ten-minute window, so every one of them is long
  // past it. Say so plainly and tell the holder what to do, rather than
  // reporting a forgery.
  if (params.legacyAlumniNumber && Number.isFinite(params.legacyExpiresAtUnix)) {
    const legacy = verifyVerificationQuery({
      cardId,
      alumniNumber: params.legacyAlumniNumber,
      expiresAtUnix: params.legacyExpiresAtUnix as number,
      signature,
    });

    return legacy.status === "expired"
      ? fail(
          "expired",
          "This card was printed before verification links became permanent. Ask the holder to reprint it from their profile."
        )
      : fail("invalid", legacy.reason ?? "Verification signature mismatch.");
  }

  if (!verifyCardSignature(cardId, signature)) {
    return fail("invalid", "Verification signature mismatch.");
  }

  const card = await prisma.idCard.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      alumniNumber: true,
      issuedAt: true,
      expiresAt: true,
      revokedAt: true,
      revokedReason: true,
      graduate: {
        select: {
          fullName: true,
          registrationNo: true,
          stateOfOrigin: true,
          graduationYear: true,
          departmentName: true,
          degreeClass: true,
          sex: true,
        },
      },
    },
  });

  if (!card) {
    return fail("invalid", "No card was issued with this identifier.");
  }

  const window = { issuedAt: card.issuedAt.toISOString(), expiresAt: card.expiresAt.toISOString() };

  if (card.revokedAt) {
    return {
      ...fail("revoked", card.revokedReason ?? "This card has been revoked by the Alumni Secretariat."),
      ...window,
    };
  }

  if (card.expiresAt.getTime() < Date.now()) {
    return { ...fail("expired", "This card has expired."), ...window };
  }

  // Identity comes from the card's own graduate, never from a registration
  // number supplied in the link. The old route looked the number up from the
  // URL, so a card could verify as somebody else entirely.
  const graduate = card.graduate;

  return {
    status: "valid",
    verified: true,
    reason: null,
    ...window,
    data: {
      cardId: card.id,
      alumniNumber: graduate.registrationNo,
      fullName: graduate.fullName,
      stateOfOrigin: graduate.stateOfOrigin ?? "Not Provided",
      graduationYear: graduate.graduationYear ?? "Not Provided",
      discipline: graduate.departmentName ?? "Not Provided",
      gender: graduate.sex === "F" ? "Female" : graduate.sex === "M" ? "Male" : "Unknown",
      rank: formatDegreeClass(graduate.degreeClass),
    },
  };
}

/** Parses the query a scanner lands on, old scheme or new. */
export function readVerificationParams(get: (key: string) => string | null): CardVerificationParams {
  const legacyAlumniNumber = get("a") ?? undefined;
  const legacyExpiry = Number(get("e") ?? "");

  return {
    cardId: get("c") ?? "",
    signature: get("s") ?? "",
    legacyAlumniNumber,
    legacyExpiresAtUnix: Number.isFinite(legacyExpiry) ? legacyExpiry : undefined,
  };
}
