import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { parseUserOutput } from "better-auth/db";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/password";
import { normalizeRegistrationNo } from "@/lib/auth-identity";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
        const identifier = ctx.body.registrationNo.trim();
        const isEmail = identifier.includes("@");

        const user = await prisma.user.findUnique({
          where: isEmail
            ? { email: identifier.toLowerCase() }
            : { registrationNo: normalizeRegistrationNo(identifier) },
        });

        if (!user) {
          await ctx.context.password.hash(ctx.body.password);
          throw new APIError("UNAUTHORIZED", {
            message: "Invalid registration number or password",
          });
        }

        const account = await prisma.account.findFirst({
          where: {
            userId: user.id,
            providerId: "credential",
          },
          select: { password: true },
        });

        if (!account?.password) {
          throw new APIError("UNAUTHORIZED", {
            message: "Invalid registration number or password",
          });
        }

        const valid = await verifyPassword(ctx.body.password, account.password);

        if (!valid) {
          throw new APIError("UNAUTHORIZED", {
            message: "Invalid registration number or password",
          });
        }

        const session = await ctx.context.internalAdapter.createSession(
          user.id,
          ctx.body.rememberMe === false
        );

        if (!session) {
          throw new APIError("INTERNAL_SERVER_ERROR", {
            message: "Failed to create session",
          });
        }

        const sessionUser = { ...user, email: user.email ?? "" };

        await setSessionCookie(
          ctx,
          { session, user: sessionUser },
          ctx.body.rememberMe === false
        );

        return ctx.json({
          token: session.token,
          user: parseUserOutput(ctx.context.options, sessionUser),
        });
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

  // ── Trusted origins (add your production URL here) ─────────────────────────
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ],
});

export type Auth = typeof auth;
