/** Set AUTH_ENABLED=true to restore login redirects and Supabase Auth flows. */
export const AUTH_ENABLED = process.env.AUTH_ENABLED === "true";

/** When true, the app uses service-role APIs + dev cookies instead of Supabase Auth sessions. */
export const DEV_BYPASS_AUTH = !AUTH_ENABLED;

/** Client-safe mirror of AUTH_ENABLED (set NEXT_PUBLIC_AUTH_ENABLED in .env.local). */
export const CLIENT_AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

export const CLIENT_DEV_BYPASS_AUTH = !CLIENT_AUTH_ENABLED;
