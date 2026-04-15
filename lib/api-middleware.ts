import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type Session = Exclude<Awaited<ReturnType<typeof auth.api.getSession>>, null>;

type SessionResultSuccess = { ok: true; session: Session };
type SessionResultError = { ok: false; error: NextResponse };

export type SessionResult = SessionResultSuccess | SessionResultError;

/**
 * Safely retrieves a session from request headers with proper error handling
 * Handles connection timeouts and other auth failures
 */
export async function getSessionSafe(
  headers: Request["headers"],
  context?: string
): Promise<SessionResult> {
  try {
    const session = await auth.api.getSession({ headers });
    if (!session) {
      return {
        ok: false,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    return { ok: true, session };
  } catch (error) {
    const ctx = context ? `[${context}]` : "";
    console.error(`${ctx} Session retrieval error:`, error);
    return {
      ok: false,
      error: NextResponse.json(
        { error: "Failed to retrieve session" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Requires user to be authenticated
 */
export async function requireAuth(
  headers: Request["headers"],
  context?: string
): Promise<SessionResult> {
  return getSessionSafe(headers, context);
}

/**
 * Requires user to be authenticated and have admin role
 */
export async function requireAdmin(
  headers: Request["headers"],
  context?: string
): Promise<SessionResult> {
  const result = await getSessionSafe(headers, context);
  if (!result.ok) {
    return result;
  }

  if (result.session.user.role !== "admin") {
    return {
      ok: false,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return result;
}

/**
 * Type-safe session result guard
 * Narrows the type to SessionResultSuccess when true
 */
export function isSessionOk(result: SessionResult): result is SessionResultSuccess {
  return result.ok === true;
}
