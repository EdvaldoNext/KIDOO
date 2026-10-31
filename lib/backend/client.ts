import type { AppClaims } from "@/lib/auth";
import { authAdmin, type AuthAdmin } from "@/lib/backend/auth-users";

import { canReadPhoto, resolveScope, type Scope } from "@/lib/backend/policies";
import { QueryBuilder, type DbResult, type ScopeResolver } from "@/lib/backend/query";
import { callRpc } from "@/lib/backend/rpc";
import { storageBucket, type StorageBucket } from "@/lib/backend/storage";

export type ClaimsResult = { data: { claims: AppClaims } | null; error: null };

/**
 * Database + storage handle with the same call style the app used with supabase-js.
 *
 * - ServiceClient: unrestricted (the old service-role key). Server code only.
 * - ScopedClient: acts on behalf of the signed-in user and is read-only; what it can read
 *   mirrors the old Row Level Security policies (see policies.ts).
 */
export class DbClient {
  readonly auth: { getClaims: () => Promise<ClaimsResult> };
  readonly storage: { from: (bucket: string) => StorageBucket };

  protected constructor(
    protected readonly scope: ScopeResolver | null,
    claims: AppClaims | null,
  ) {
    this.auth = {
      getClaims: async () => ({ data: claims ? { claims } : null, error: null }),
    };
    this.storage = {
      from: (bucket: string) => {
        const base = storageBucket(bucket);
        if (!this.scope) return base;
        const scope = this.scope;
        return {
          ...base,
          upload: async () => ({ data: null, error: { message: "permission denied" } }),
          remove: async () => ({ data: null, error: { message: "permission denied" } }),
          download: async () => ({ data: null, contentType: null, error: { message: "permission denied" } }),
          createSignedUrl: async (key, expiresInSeconds) => {
            if (!canReadPhoto(await scope(), key)) {
              return { data: null, error: { message: "Object not found" } };
            }
            return base.createSignedUrl(key, expiresInSeconds);
          },
        };
      },
    };
  }

  from(table: string) {
    return new QueryBuilder(table, this.scope);
  }

  rpc(name: string, args: Record<string, unknown> = {}): PromiseLike<DbResult> {
    return callRpc(name, args, this.scope);
  }
}

export class ServiceClient extends DbClient {
  constructor() {
    super(null, null);
  }

  // Keep the `client.auth.admin.*` call shape used across the routes.
  override readonly auth: { admin: AuthAdmin; getClaims: () => Promise<ClaimsResult> } = {
    admin: authAdmin,
    getClaims: async () => ({ data: null, error: null }),
  };
}

export class ScopedClient extends DbClient {
  constructor(claims: AppClaims | null) {
    let cached: Promise<Scope> | null = null;
    super(() => (cached ??= resolveScope(claims)), claims);
  }
}
