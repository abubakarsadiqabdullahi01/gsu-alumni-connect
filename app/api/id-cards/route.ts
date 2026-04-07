import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signIdCardPayload, signVerificationQuery } from "@/lib/id-card-security";

const FRONT_TEMPLATE_URL = "/images/id-card-template/Front-ID.png";
const BACK_TEMPLATE_URL = "/images/id-card-template/Back-ID.png";
const DEFAULT_PHOTO_URL = "/images/developer.jpeg";
const DEFAULT_SIGNATURE_URL = "/images/Signature.png";
const CARD_TTL_MS = 1000 * 60 * 10;

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

function buildResponse(payload: IdCardPayload, origin: string) {
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CARD_TTL_MS).toISOString();
  const expiresAtUnix = Math.floor(new Date(expiresAt).getTime() / 1000);
  const cardId = randomUUID();
  const signature = signIdCardPayload(payload, issuedAt, expiresAt);
  const verificationSignature = signVerificationQuery(cardId, payload.alumniNumber, expiresAtUnix);
  const verificationUrl = `${origin}/verify/id-card?c=${encodeURIComponent(cardId)}&a=${encodeURIComponent(payload.alumniNumber)}&e=${expiresAtUnix}&s=${encodeURIComponent(verificationSignature)}`;

  return {
    cardId,
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
      signature,
      issuedAt,
      expiresAt,
      tamperProtected: true,
      classification: "enterprise-premium",
    },
  };
}

function getSamplePayload(): IdCardPayload {
  return {
    fullName: "Abubakar Sadiq Abdullahi",
    alumniNumber: "UG19/ASAC/1025",
    stateOfOrigin: "Gombe",
    imageUrl: DEFAULT_PHOTO_URL,
    signatureUrl: DEFAULT_SIGNATURE_URL,
    graduationYear: "2023-2024",
    discipline: "Accounting",
    gender: "Male",
    rank: "Second Class Upper",
  };
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
    const mode = request.nextUrl.searchParams.get("mode");
    if (mode === "sample") {
      return NextResponse.json({
        status: "ok",
        data: buildResponse(getSamplePayload(), origin),
      });
    }

    const guard = await getSession(request);
    if (guard.error) return guard.error;

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

    return NextResponse.json({
      status: "ok",
      data: buildResponse(payload, origin),
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

    return NextResponse.json({
      status: "ok",
      data: buildResponse(parsed.data, origin),
    });
  } catch (error) {
    console.error("[IdCardsAPI][POST] Error:", error);
    return NextResponse.json({ error: "Failed to process ID card payload." }, { status: 500 });
  }
}
