/**
 * The pure parts of the activation check: matching, and the token that
 * carries a correct default password across to the verification step.
 *
 *   npx tsx --test lib/activation.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  cgpaMatches,
  surnameMatches,
  recordedSurname,
  methodFor,
  signActivationToken,
  verifyActivationToken,
  clientIp,
} from "./activation-rules";

// Read at call time, so setting it after the import is enough.
process.env.BETTER_AUTH_SECRET = "test-secret-for-activation-tokens";

test("CGPA: accepts the formats people type", () => {
  for (const typed of ["3.5", "3.50", " 3.50 ", "3,50", "3.500"]) {
    assert.equal(cgpaMatches(typed, "3.50"), true, typed);
  }
  assert.equal(cgpaMatches("4", "4.00"), true);
});

test("CGPA: refuses near misses and junk", () => {
  assert.equal(cgpaMatches("3.49", "3.50"), false);
  assert.equal(cgpaMatches("3.499", "3.50"), false, "a third significant decimal is refused, not rounded up");
  assert.equal(cgpaMatches("3.51", "3.50"), false);
  assert.equal(cgpaMatches("", "3.50"), false);
  assert.equal(cgpaMatches("three", "3.50"), false);
  assert.equal(cgpaMatches("3.5.0", "3.50"), false);
  assert.equal(cgpaMatches("3.50", null), false, "no CGPA on record can never match");
});

test("surname: ignores case, spaces, hyphens and apostrophes", () => {
  const graduate = { surname: "Abdul-Kareem", fullName: "ABDUL-KAREEM MUSA" };
  for (const typed of ["abdul-kareem", "ABDULKAREEM", "Abdul Kareem", " abdul kareem ", "Abdul'Kareem", "Abdul’Kareem"]) {
    assert.equal(surnameMatches(typed, graduate), true, typed);
  }
  assert.equal(surnameMatches("Musa", graduate), false, "a first name is not the surname");
  assert.equal(surnameMatches("", graduate), false);
});

test("surname: falls back to the first word of the full name", () => {
  // 41 records without a CGPA have no surname column; the sheets write surname first.
  const graduate = { surname: null, fullName: "ABDULLAHI ABUBAKAR SADIQ" };
  assert.equal(recordedSurname(graduate), "ABDULLAHI");
  assert.equal(surnameMatches("abdullahi", graduate), true);
  assert.equal(surnameMatches("Sadiq", graduate), false);
});

test("method: CGPA when the record has one, surname otherwise", () => {
  assert.equal(methodFor({ cgpa: "3.50" }), "cgpa");
  assert.equal(methodFor({ cgpa: null }), "surname");
});

test("activation token: round-trips for its user", () => {
  const token = signActivationToken("user-123");
  assert.equal(verifyActivationToken(token), "user-123");
});

test("activation token: expires after ten minutes", () => {
  const issued = Date.UTC(2026, 10, 24, 12, 0, 0);
  const token = signActivationToken("user-123", issued);
  assert.equal(verifyActivationToken(token, issued + 9 * 60_000), "user-123");
  assert.equal(verifyActivationToken(token, issued + 11 * 60_000), null);
});

test("activation token: refuses tampering", () => {
  const token = signActivationToken("user-123");
  const [body, signature] = token.split(".");
  const forgedBody = Buffer.from(`someone-else.${Math.floor(Date.now() / 1000) + 600}`).toString("base64url");
  assert.equal(verifyActivationToken(`${forgedBody}.${signature}`), null, "another user's id");
  assert.equal(verifyActivationToken(`${body}.${signature.slice(0, -2)}AA`), null, "altered signature");
  assert.equal(verifyActivationToken("not-a-token"), null);
  assert.equal(verifyActivationToken(""), null);
});

test("activation token: refuses everything without a signing secret", () => {
  const token = signActivationToken("user-123");
  const saved = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = "";
  try {
    assert.equal(verifyActivationToken(token), null);
  } finally {
    process.env.BETTER_AUTH_SECRET = saved;
  }
});

test("client IP: prefers Vercel's x-real-ip, then the first forwarded hop", () => {
  assert.equal(clientIp(new Headers({ "x-real-ip": "41.1.1.1", "x-forwarded-for": "9.9.9.9" })), "41.1.1.1");
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "41.2.2.2, 10.0.0.1" })), "41.2.2.2");
  assert.equal(clientIp(new Headers()), "unknown");
});
