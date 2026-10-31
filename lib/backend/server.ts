import { cookies } from "next/headers";
import { ScopedClient } from "@/lib/backend/client";
import { SESSION_COOKIE, verifySession } from "@/lib/backend/session";

/** Client scoped to the signed-in user (read-only, family-restricted). */
export async function createClient() {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  return new ScopedClient(session?.claims ?? null);
}
