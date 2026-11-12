import {
  SESSION_COOKIE_ATTRIBUTES,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "./constants";

/**
 * Cookie construction for the session.
 *
 * The attributes are assembled by hand rather than through a framework helper
 * so they can be asserted in unit tests: HttpOnly, SameSite=Lax, Path=/,
 * an explicit expiry, and Secure whenever the app runs in production.
 */

export interface CookieOptions {
  /** Lifetime in seconds. `0` expires the cookie immediately. */
  maxAge?: number;
  /** Absolute expiry date. */
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
}

/** True when the app is running in a production environment. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Serialise a cookie into a `Set-Cookie` header value. */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const {
    maxAge,
    expires,
    httpOnly = true,
    secure = isProduction(),
    sameSite = "lax",
    path = "/",
  } = options;

  const parts = [`${name}=${encodeURIComponent(value)}`];

  parts.push(`Path=${path}`);

  if (maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(maxAge)}`);
  }

  if (expires !== undefined) {
    parts.push(`Expires=${expires.toUTCString()}`);
  }

  if (httpOnly) {
    parts.push("HttpOnly");
  }

  if (secure) {
    parts.push("Secure");
  }

  parts.push(`SameSite=${sameSite === "lax" ? "Lax" : sameSite === "strict" ? "Strict" : "None"}`);

  return parts.join("; ");
}

/** Build the cookie that carries a valid session. */
export function buildSessionCookie(
  token: string,
  maxAge: number = SESSION_MAX_AGE_SECONDS,
): string {
  return serializeCookie(SESSION_COOKIE_NAME, token, {
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
    httpOnly: SESSION_COOKIE_ATTRIBUTES.httpOnly,
    sameSite: SESSION_COOKIE_ATTRIBUTES.sameSite,
    path: SESSION_COOKIE_ATTRIBUTES.path,
  });
}

/** Build the cookie that removes an existing session. */
export function clearSessionCookie(): string {
  return serializeCookie(SESSION_COOKIE_NAME, "", {
    maxAge: 0,
    expires: new Date(0),
    httpOnly: SESSION_COOKIE_ATTRIBUTES.httpOnly,
    sameSite: SESSION_COOKIE_ATTRIBUTES.sameSite,
    path: SESSION_COOKIE_ATTRIBUTES.path,
  });
}
