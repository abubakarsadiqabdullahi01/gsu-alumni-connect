import { createHmac, timingSafeEqual } from "node:crypto";

export type IdCardVerificationPayload = {
  fullName: string;
  alumniNumber: string;
  stateOfOrigin: string;
  imageUrl: string;
  signatureUrl?: string;
  graduationYear: string;
  discipline: string;
  gender: "Male" | "Female" | "Other" | "Unknown";
  rank: string;
};

function getSigningSecret(): string {
  return process.env.ID_CARD_SIGNING_SECRET ?? process.env.BETTER_AUTH_SECRET ?? "dev-card-secret";
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export function signIdCardPayload(
  payload: IdCardVerificationPayload,
  issuedAt: string,
  expiresAt: string
): string {
  return createHmac("sha256", getSigningSecret())
    .update(JSON.stringify({ payload, issuedAt, expiresAt }))
    .digest("base64url");
}

export function signVerificationQuery(cardId: string, alumniNumber: string, expiresAtUnix: number): string {
  return createHmac("sha256", getSigningSecret())
    .update(`${cardId}|${alumniNumber.toUpperCase()}|${expiresAtUnix}`)
    .digest("base64url");
}

export function verifyVerificationQuery(params: {
  cardId: string;
  alumniNumber: string;
  expiresAtUnix: number;
  signature: string;
}): {
  ok: boolean;
  status: "valid" | "expired" | "invalid";
  reason?: string;
} {
  if (!params.cardId || !params.alumniNumber || !params.signature || !Number.isFinite(params.expiresAtUnix)) {
    return { ok: false, status: "invalid", reason: "Missing verification parameters." };
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  if (nowUnix > params.expiresAtUnix) {
    return { ok: false, status: "expired", reason: "Card verification URL expired." };
  }

  const expected = signVerificationQuery(params.cardId, params.alumniNumber, params.expiresAtUnix);
  if (!safeEqual(params.signature, expected)) {
    return { ok: false, status: "invalid", reason: "Verification signature mismatch." };
  }

  return { ok: true, status: "valid" };
}

