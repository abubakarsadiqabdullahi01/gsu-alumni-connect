import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { APIError, createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { parseUserOutput } from "better-auth/db";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/password";
import { normalizeRegistrationNo } from "@/lib/auth-identity";
import {
  LIMITS,
  attemptVerification,
  clientIp,
  methodFor,
  promptFor,
  recordAuthEvent,
  signActivationToken,
  signInBlockedBy,
  verifyActivationToken,
} from "@/lib/activation";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const INVALID_CREDENTIALS = "Invalid registration number or password";

type AuthContext = Parameters<typeof setSessionCookie>[0];
type SessionUser = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;

/** The one place a session is created, for sign-in and for completed activation alike. */
async function startSession(ctx: AuthContext, user: SessionUser, dontRemember: boolean) {
  const session = await ctx.context.internalAdapter.createSession(user.id, dontRemember);
  if (!session) {
    throw new APIError("INTERNAL_SERVER_ERROR", { message: "Failed to create session" });
  }
  const sessionUser = { ...user, email: user.email ?? "" };
  await setSessionCookie(ctx, { session, user: sessionUser }, dontRemember);
  return { token: session.token, user: parseUserOutput(ctx.context.options, sessionUser) };
}

const registrationSignInPlugin = {
  id: "registration-sign-in",
  endpoints: {
    signInRegistration: createAuthEndpoint(
      "/sign-in/registration",
      {
        method: "POST",
        body: z.object({
          registrationNo: z.string(),
          password: z.string(),
          rememberMe: z.boolean().optional(),
        }),
      },
      async (ctx) => {
        const raw = ctx.body.registrationNo.trim();
        const isEmail = raw.includes("@");
        const identifier = isEmail ? raw.toLowerCase() : normalizeRegistrationNo(raw);
        const headers = ctx.request?.headers ?? new Headers();
        const ip = clientIp(headers);
        const userAgent = headers.get("user-agent");

        // Checked before the password, so a paused identifier gives nothing away.
        const blockedBy = await signInBlockedBy(identifier, ip);
        if (blockedBy) {
          await recordAuthEvent("SIGN_IN_RATE_LIMITED", { identifier, ip, userAgent, reason: `by ${blockedBy}` });
          throw new APIError(
            "TOO_MANY_REQUESTS",
            { message: "Too many failed sign-in attempts. Please wait 15 minutes and try again." },
            { "Retry-After": String(LIMITS.signInWindowSeconds) }
          );
        }

        // The SIGN_IN_FAILED row is the count the limit above reads.
        const fail = async (reason: string, userId?: string) => {
          await recordAuthEvent("SIGN_IN_FAILED", { identifier, userId, ip, userAgent, reason });
          return new APIError("UNAUTHORIZED", { message: INVALID_CREDENTIALS });
        };

        const user = await prisma.user.findUnique({
          where: isEmail ? { email: identifier } : { registrationNo: identifier },
        });

        if (!user) {
          await ctx.context.password.hash(ctx.body.password); // same timing as a real check
          throw await fail("unknown identifier");
        }

        const account = await prisma.account.findFirst({
          where: { userId: user.id, providerId: "credential" },
          select: { password: true },
        });
        if (!account?.password) throw await fail("no password set", user.id);

        if (!(await verifyPassword(ctx.body.password, account.password))) {
          throw await fail("wrong password", user.id);
        }

        // The default password is published, so it proves only that someone
        // knows a registration number. Before any session exists, the graduate
        // must also give something the record holds and the number does not
        // reveal. The account stays unopened until they do.
        if (user.defaultPassword) {
          const graduate = await prisma.graduate.findUnique({
            where: { userId: user.id },
            select: { cgpa: true },
          });
          if (graduate) {
            const method = methodFor(graduate);
            await recordAuthEvent("ACTIVATION_REQUIRED", { identifier, userId: user.id, ip, userAgent, reason: method });
            return ctx.json({
              status: "verification_required" as const,
              method,
              prompt: promptFor(method),
              activationToken: signActivationToken(user.id),
              registrationNo: user.registrationNo,
            });
          }
        }

        return ctx.json(await startSession(ctx, user, ctx.body.rememberMe === false));
      }
    ),

    verifyActivation: createAuthEndpoint(
      "/activation/verify",
      {
        method: "POST",
        body: z.object({
          activationToken: z.string(),
          answer: z.string().max(80),
          rememberMe: z.boolean().optional(),
        }),
      },
      async (ctx) => {
        const headers = ctx.request?.headers ?? new Headers();
        const ip = clientIp(headers);
        const userAgent = headers.get("user-agent");

        const userId = verifyActivationToken(ctx.body.activationToken);
        if (!userId) {
          await recordAuthEvent("ACTIVATION_FAILED", { ip, userAgent, reason: "invalid or expired activation token" });
          throw new APIError("BAD_REQUEST", { message: "This activation step has expired. Please sign in again." });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const graduate = await prisma.graduate.findUnique({
          where: { userId },
          select: { id: true, registrationNo: true, fullName: true, surname: true, cgpa: true },
        });
        if (!user || !graduate || !user.defaultPassword) {
          throw new APIError("BAD_REQUEST", { message: "This account is already activated. Please sign in with your password." });
        }

        const outcome = await attemptVerification({ graduate, userId, answer: ctx.body.answer, ip, userAgent });
        if (!outcome.ok) {
          throw new APIError(outcome.status, { message: outcome.message, remaining: outcome.remaining });
        }

        return ctx.json(await startSession(ctx, user, ctx.body.rememberMe === false));
      }
    ),
  },
};

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Required secret for session signing
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  // ── Email + password (registration-number login handled by custom endpoint) ──
  emailAndPassword: {
    enabled: true,
    // Accounts exist only because the Secretariat imported a graduation record.
    // Left enabled, Better Auth's public /sign-up/email let anyone create one —
    // under an unclaimed graduate's registration number if they liked. The
    // admin setting "self-registration off" was a database flag nothing here
    // read. Sign-in, activation and password reset do not use this route.
    disableSignUp: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,

    sendResetPassword: async ({ user, url }) => {
      if (!user.email) return;
      const displayName = escapeHtml(user.name || "there");

      await sendEmail({
        to: user.email,
        subject: "Reset your GSU Alumni Connect password",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin: 0 0 12px;">Reset your password</h2>
            <p>Hello ${displayName},</p>
            <p>Use the button below to set a new password for your GSU Alumni Connect account. This link expires in 1 hour.</p>
            <p>
              <a href="${url}" style="display: inline-block; background: #047857; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 700;">
                Reset password
              </a>
            </p>
            <p>If the button does not work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all;"><a href="${url}">${url}</a></p>
            <p>If you did not request this, you can ignore this email.</p>
          </div>
        `,
        text: `Hello ${user.name || "there"},\n\nUse this link to reset your GSU Alumni Connect password. It expires in 1 hour:\n${url}\n\nIf you did not request this, you can ignore this email.`,
      });
    },

    onPasswordReset: async ({ user }) => {
      await prisma.user.update({
        where: { id: user.id },
        data: { defaultPassword: false },
      });
    },

    // Use our scrypt-based hasher (matches what the import engine generates)
    password: {
      hash:   (password: string) => hashPassword(password),
      verify: ({ hash, password }: { hash: string; password: string }) =>
        verifyPassword(password, hash),
    },
  },

  // ── Session ────────────────────────────────────────────────────────────────
  session: {
    expiresIn:          60 * 60 * 24 * 7,  // 7 days
    updateAge:          60 * 60 * 24,       // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge:  5 * 60, // 5 minute cookie cache
    },
  },

  // ── Admin plugin ───────────────────────────────────────────────────────────
  plugins: [
    admin(),
    registrationSignInPlugin,
  ],

  // ── Custom fields mapped to the User model ─────────────────────────────────
  user: {
    additionalFields: {
      registrationNo:  { type: "string",  required: true,  unique: true },
      defaultPassword: { type: "boolean", required: false, defaultValue: true },
      accountStatus:   { type: "string",  required: false, defaultValue: "PENDING" },
      phone:           { type: "string",  required: false, unique: true },
    },
  },

  // Better Auth's own /sign-in/email would let an account in on its password
  // alone, skipping the activation check. /sign-in/registration already
  // accepts an email address, so it stays the only way in.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email") {
        throw new APIError("FORBIDDEN", { message: "Please sign in with your registration number or email on the sign-in page." });
      }
    }),
  },

  // ── Trusted origins (add your production URL here) ─────────────────────────
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ],
});

export type Auth = typeof auth;
