import { NextRequest, NextResponse } from "next/server";
import { readVerificationParams, resolveCardVerification } from "@/lib/id-card-verification";

const STATUS_CODES = {
  valid: 200,
  expired: 410,
  revoked: 410,
  invalid: 400,
} as const;

export async function GET(request: NextRequest) {
  const params = readVerificationParams((key) => request.nextUrl.searchParams.get(key));
  const verification = await resolveCardVerification(params);

  return NextResponse.json(
    {
      status: verification.status,
      verified: verification.verified,
      reason: verification.reason,
      verifiedAt: new Date().toISOString(),
      data: verification.data
        ? {
            ...verification.data,
            security: {
              algorithm: "HMAC-SHA256",
              issuedAt: verification.issuedAt,
              expiresAt: verification.expiresAt,
              classification: "enterprise-premium",
            },
          }
        : null,
    },
    {
      status: STATUS_CODES[verification.status],
      // A verification result is about this card at this moment: revocation has
      // to take effect on the next scan, not after a cache expires.
      headers: { "Cache-Control": "no-store" },
    }
  );
}
