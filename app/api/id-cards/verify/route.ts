import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyVerificationQuery } from "@/lib/id-card-security";

export async function GET(request: NextRequest) {
  const cardId = request.nextUrl.searchParams.get("c") ?? "";
  const alumniNumber = request.nextUrl.searchParams.get("a") ?? "";
  const expiresAtUnix = Number(request.nextUrl.searchParams.get("e") ?? "");
  const signature = request.nextUrl.searchParams.get("s") ?? "";

  const verified = verifyVerificationQuery({ cardId, alumniNumber, expiresAtUnix, signature });
  const statusCode = verified.status === "valid" ? 200 : verified.status === "expired" ? 410 : 400;

  let graduate: {
    fullName: string;
    registrationNo: string;
    stateOfOrigin: string | null;
    graduationYear: string | null;
    departmentName: string | null;
    degreeClass: string | null;
    sex: "M" | "F" | null;
  } | null = null;

  if (verified.ok) {
    graduate = await prisma.graduate.findUnique({
      where: { registrationNo: alumniNumber },
      select: {
        fullName: true,
        registrationNo: true,
        stateOfOrigin: true,
        graduationYear: true,
        departmentName: true,
        degreeClass: true,
        sex: true,
      },
    });
  }

  return NextResponse.json(
    {
      status: verified.status,
      verified: verified.ok,
      reason: verified.reason ?? null,
      verifiedAt: new Date().toISOString(),
      data: graduate
        ? {
            cardId,
            alumniNumber: graduate.registrationNo,
            fullName: graduate.fullName,
            stateOfOrigin: graduate.stateOfOrigin ?? "Not Provided",
            graduationYear: graduate.graduationYear ?? "Not Provided",
            discipline: graduate.departmentName ?? "Not Provided",
            gender: graduate.sex === "F" ? "Female" : graduate.sex === "M" ? "Male" : "Unknown",
            rank: graduate.degreeClass ?? "Alumni Member",
            security: {
              algorithm: "HMAC-SHA256",
              expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
              classification: "enterprise-premium",
            },
          }
        : null,
    },
    { status: statusCode }
  );
}

