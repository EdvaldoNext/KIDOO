import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";
import type { AppClaims } from "@/lib/auth";

/** Cookie holding the signed session JWT (replaces the old sb-*-auth-token cookies). */
export const SESSION_COOKIE = "kidoo_session";

/** Same lifetime the old Supabase refresh cookie had on this app: 180 days. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 180;

/** Re-sign the token when it is older than this, so active devices never expire. */
export const SESSION_REFRESH_AFTER = 60 * 60 * 24;

const DEV_FALLBACK_SECRET = "kidoo-dev-only-secret-change-me-in-production-0000";

function secretKey() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret && secret.length >= 32) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET ausente (mínimo de 32 caracteres) no servidor.");
  }
  return new TextEncoder().encode(DEV_FALLBACK_SECRET);
}

export type SessionUser = {
  id: string;
  email?: string | null;
  app_metadata?: AppClaims["app_metadata"] | Record<string, unknown> | null;
};

export async function signSession(user: SessionUser) {
  return new SignJWT({
    email: user.email ?? undefined,
    app_metadata: (user.app_metadata ?? {}) as Record<string, unknown>,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export type VerifiedSession = {
  claims: AppClaims;
  issuedAt: number;
};

export async function verifySession(token: string | null | undefined): Promise<VerifiedSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return {
      claims: {
        sub: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
        app_metadata: (payload.app_metadata ?? {}) as AppClaims["app_metadata"],
      },
      issuedAt: typeof payload.iat === "number" ? payload.iat : 0,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure,
  };
}

export function setSessionCookie(response: NextResponse, token: string, secure: boolean) {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(secure));
  return response;
}

export function clearSessionCookie(response: NextResponse, secure: boolean) {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(secure), maxAge: 0 });
  return response;
}
