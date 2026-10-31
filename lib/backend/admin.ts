import { ServiceClient } from "@/lib/backend/client";
import { getDb } from "@/lib/backend/db";

/** Unrestricted server-side client (what the Supabase service-role client used to be). */
export function createServiceClient() {
  getDb(); // fail fast when TURSO_* env vars are missing
  return new ServiceClient();
}
