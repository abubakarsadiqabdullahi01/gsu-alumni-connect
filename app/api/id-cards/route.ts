import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signCardId, signIdCardPayload } from "@/lib/id-card-security";

const FRONT_TEMPLATE_URL = "/images/id-card-template/Front-ID.png";
const BACK_TEMPLATE_URL = "/images/id-card-template/Back-ID.png";
const DEFAULT_PHOTO_URL = "/images/developer.jpeg";
const DEFAULT_SIGNATURE_URL = "/images/Signature.png";

/**
 * How long an issued card stays valid.
 *
 * This is the card's life as a document, not the life of a web request. The
 * previous ten-minute value was the latter, which meant a printed card stopped
 * verifying before the graduate had walked out of the room.
 */
const CARD_VALIDITY_YEARS = 5;

const idCardPayloadSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  alumniNumber: z.string().trim().min(3).max(40),
  stateOfOrigin: z.string().trim().min(2).max(80),
  imageUrl: z
    .string()
    .trim()
    .url()
    .or(z.string().trim().regex(/^\/images\/[a-zA-Z0-9/_\-.]+$/)),
  signatureUrl: z
    .string()
    .trim()
    .url()
    .or(z.string().trim().regex(/^\/images\/[a-zA-Z0-9/_\-.]+$/))
    .optional(),
  graduationYear: z.string().trim().min(4).max(20),
  discipline: z.string().trim().min(2).max(120),
  gender: z.enum(["Male", "Female", "Other", "Unknown"]),
  rank: z.string().trim().min(2).max(80),
});

type IdCardPayload = z.infer<typeof idCardPayloadSchema>;

function formatDegreeClass(degreeClass: string | null): string {
  if (!degreeClass) return "Alumni Member";
  return degreeClass
    .split("_")
    .map((chunk) => chunk.charAt(0) + chunk.slice(1).toLowerCase())
    .join(" ");
}

function mapSexToGender(sex: "M" | "F" | null): IdCardPayload["gender"] {
  if (sex === "M") return "Male";
  if (sex === "F") return "Female";
  return "Unknown";
}

/**
 * The graduate's current card, issued on first request and reused after.
 *
 * Reuse matters: minting a new card per page load would leave a graduate with
 * several live cards and no way to tell which one a stranger is holding. One
 * live card per graduate means revoking it revokes what they actually carry.
 */
async function getOrIssueCard(graduateId: string, payload: IdCardPayload) {
  const now = new Date();

  const existing = await prisma.idCard.findFirst({
    where: { graduateId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { issuedAt: "desc" },
  });
  if (existing) return existing;

  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + CARD_VALIDITY_YEARS);

  return prisma.idCard.create({
    data: {
      graduateId,
      alumniNumber: payload.alumniNumber,
      payloadHash: signIdCardPayload(payload, now.toISOString(), expiresAt.toISOString()),
      issuedAt: now,
      expiresAt,
    },
  });
}

type IssuedCard = {
  id: string;
  issuedAt: Date;
  expiresAt: Date;
  payloadHash: string;
};

function buildResponse(payload: IdCardPayload, origin: string, card: IssuedCard) {
  // The QR carries an opaque id and a signature — never a name or registration
  // number. A card is scanned by strangers and photographed; a URL is the last
  // place personal data should sit.
  const verificationUrl = `${origin}/verify/id-card?c=${encodeURIComponent(card.id)}&s=${encodeURIComponent(signCardId(card.id))}`;

  return {
    cardId: card.id,
    payload,
    verification: {
      url: verificationUrl,
      token: null,
      status: "signed",
    },
    templates: {
      front: FRONT_TEMPLATE_URL,
      back: BACK_TEMPLATE_URL,
    },
    security: {
      algorithm: "HMAC-SHA256",
      signature: card.payloadHash,
      issuedAt: card.issuedAt.toISOString(),
      expiresAt: card.expiresAt.toISOString(),
      tamperProtected: true,
      classification: "enterprise-premium",
    },
  };
}

/**
 * Preview data for layout work.
 *
 * The registration number is deliberately one that cannot exist, because this
 * used to carry a real graduate's — which any unauthenticated caller could then
 * resolve to that person's name, state, department and degree class through the
 * public verification endpoint.
 */
function getSamplePayload(): IdCardPayload {
  return {
    fullName: "Specimen — Not A Real Card",
    alumniNumber: "UG00/DEMO/0000",
    stateOfOrigin: "Gombe",
    imageUrl: DEFAULT_PHOTO_URL,
    signatureUrl: DEFAULT_SIGNATURE_URL,
    graduationYear: "2023-2024",
    discipline: "Accounting",
    gender: "Male",
    rank: "Second Class Upper",
  };
}

/** A specimen card: shaped like the real thing, but it resolves to nothing. */
function buildSampleResponse(origin: string) {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + CARD_VALIDITY_YEARS);
  const payload = getSamplePayload();

  return buildResponse(payload, origin, {
    id: "00000000-0000-0000-0000-000000000000",
    issuedAt,
    expiresAt,
    payloadHash: signIdCardPayload(payload, issuedAt.toISOString(), expiresAt.toISOString()),
  });
}

async function getSession(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin;

    // Sample mode is behind the session too. It is a layout aid, not a public
    // endpoint, and it used to be the one unauthenticated way to mint a signed
    // verification link.
    const guard = await getSession(request);
    if (guard.error) return guard.error;

    if (request.nextUrl.searchParams.get("mode") === "sample") {
      return NextResponse.json({ status: "ok", data: buildSampleResponse(origin) });
    }

    const graduate = await prisma.graduate.findUnique({
      where: { userId: guard.session.user.id },
      include: {
        user: {
          select: {
            image: true,
          },
        },
      },
    });

    if (!graduate) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const payload = idCardPayloadSchema.parse({
      fullName: graduate.fullName,
      alumniNumber: graduate.registrationNo,
      stateOfOrigin: graduate.stateOfOrigin ?? "Not Provided",
      imageUrl: graduate.user.image ?? DEFAULT_PHOTO_URL,
      signatureUrl: graduate.signatureUrl ?? DEFAULT_SIGNATURE_URL,
      graduationYear: graduate.graduationYear ?? "Not Provided",
      discipline: graduate.departmentName ?? graduate.courseCode ?? "Not Provided",
      gender: mapSexToGender(graduate.sex),
      rank: formatDegreeClass(graduate.degreeClass),
    });

    const card = await getOrIssueCard(graduate.id, payload);

    return NextResponse.json({
      status: "ok",
      data: buildResponse(payload, origin, card),
    });
  } catch (error) {
    console.error("[IdCardsAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to generate ID card data." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin;
    const guard = await getSession(request);
    if (guard.error) return guard.error;

    const body = await request.json();
    const parsed = idCardPayloadSchema.safeParse({
      ...body,
      imageUrl: typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl : DEFAULT_PHOTO_URL,
      signatureUrl:
        typeof body?.signatureUrl === "string" && body.signatureUrl.trim()
          ? body.signatureUrl
          : DEFAULT_SIGNATURE_URL,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid ID card payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    if (
      guard.session.user.role !== "admin" &&
      parsed.data.alumniNumber.toUpperCase() !== guard.session.user.registrationNo.toUpperCase()
    ) {
      return NextResponse.json(
        { error: "Forbidden: you can only generate your own ID card payload." },
        { status: 403 }
      );
    }

    // A card has to belong to someone. Issuing one for a registration number
    // with no graduate behind it would produce a card that verifies to nothing.
    const graduate = await prisma.graduate.findUnique({
      where: { registrationNo: parsed.data.alumniNumber },
      select: { id: true },
    });

    if (!graduate) {
      return NextResponse.json(
        { error: "No graduate found for that registration number." },
        { status: 404 }
      );
    }

    const card = await getOrIssueCard(graduate.id, parsed.data);

    return NextResponse.json({
      status: "ok",
      data: buildResponse(parsed.data, origin, card),
    });
  } catch (error) {
    console.error("[IdCardsAPI][POST] Error:", error);
    return NextResponse.json({ error: "Failed to process ID card payload." }, { status: 500 });
  }
}
