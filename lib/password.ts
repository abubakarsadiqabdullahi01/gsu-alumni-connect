import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";

// ── Promisified scrypt ─────────────────────────────────────────────────────────
function scryptAsync(
  password: string,
  salt: string,
  keylen: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
}

// ── Default password generator ─────────────────────────────────────────────────
// Default password policy: normalized registration number + inferred entry year.
// Example: UG19/ASAC/1025 -> UG19/ASAC/10252019
export function generateDefaultPassword(registrationNo: string): string {
  const normalized = registrationNo.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/UG(\d{2})/i);
  const year = match ? `20${match[1]}` : "0000";
  return `${normalized}${year}`;
}

// ── Hash (scrypt, 64-byte key, 16-byte random salt) ────────────────────────────
// Stored format:  <hex-hash>.<hex-salt>
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

// ── Verify ─────────────────────────────────────────────────────────────────────
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const buf = await scryptAsync(password, salt, 64);
  const hashedBuf = Buffer.from(hashed, "hex");
  if (buf.length !== hashedBuf.length) return false;
  return timingSafeEqual(buf, hashedBuf);
}
