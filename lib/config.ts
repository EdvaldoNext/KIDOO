/** Production default: auth is on unless explicitly disabled for local tests. */
export const AUTH_ENABLED = process.env.AUTH_ENABLED !== "false";

/** When true, the app uses service-role APIs + device cookies instead of Supabase Auth sessions. */
export const DEV_BYPASS_AUTH = !AUTH_ENABLED;

/** Client-safe mirror of AUTH_ENABLED (set NEXT_PUBLIC_AUTH_ENABLED in .env.local). */
export const CLIENT_AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";

export const CLIENT_DEV_BYPASS_AUTH = !CLIENT_AUTH_ENABLED;
