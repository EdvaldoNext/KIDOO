import bcrypt from "bcryptjs";
import { getDb } from "@/lib/backend/db";
import { normalizeTimestamp } from "@/lib/backend/tables";

/**
 * User accounts (replaces Supabase GoTrue / auth.users).
 * The shape mirrors `auth.admin.*` so the routes that already used it keep working.
 */
export type AuthUser = {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  created_at: string;
};

export type AuthError = { message: string; code?: string; status?: number };

type UserRow = {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  raw_app_meta_data: string | null;
  raw_user_meta_data: string | null;
  created_at: string;
  encrypted_password: string | null;
};

const BCRYPT_ROUNDS = 10;

function parseJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toUser(row: Record<string, unknown>): AuthUser {
  const data = row as unknown as UserRow;
  return {
    id: data.id,
    email: data.email,
    email_confirmed_at: data.email_confirmed_at,
    app_metadata: parseJson(data.raw_app_meta_data),
    user_metadata: parseJson(data.raw_user_meta_data),
    created_at: data.created_at,
  };
}

const USER_COLUMNS = "id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function checkPassword(password: string, hash: string | null | undefined) {
  if (!hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const result = await getDb().execute({
    sql: `SELECT ${USER_COLUMNS} FROM users WHERE email = ?`,
    args: [email.trim().toLowerCase()],
  });
  const row = result.rows[0];
  return row ? toUser(row as unknown as Record<string, unknown>) : null;
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const result = await getDb().execute({
    sql: `SELECT ${USER_COLUMNS} FROM users WHERE id = ?`,
    args: [id],
  });
  const row = result.rows[0];
  return row ? toUser(row as unknown as Record<string, unknown>) : null;
}

/** Returns the stored hash for a user (never exposed through AuthUser). */
export async function getPasswordHash(userId: string): Promise<string | null> {
  const result = await getDb().execute({
    sql: "SELECT encrypted_password FROM users WHERE id = ?",
    args: [userId],
  });
  return (result.rows[0]?.encrypted_password as string | null | undefined) ?? null;
}

export async function setPassword(userId: string, password: string) {
  await getDb().execute({
    sql: "UPDATE users SET encrypted_password = ?, updated_at = ? WHERE id = ?",
    args: [await hashPassword(password), new Date().toISOString(), userId],
  });
}

export async function touchLastSignIn(userId: string) {
  await getDb().execute({
    sql: "UPDATE users SET last_sign_in_at = ? WHERE id = ?",
    args: [new Date().toISOString(), userId],
  });
}

type CreateUserInput = {
  email: string;
  password?: string;
  email_confirm?: boolean;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

type UpdateUserInput = {
  email?: string;
  password?: string;
  email_confirm?: boolean;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

/** Drop-in for `supabase.auth.admin`, backed by the `users` table. */
export const authAdmin = {
  async listUsers(params?: { page?: number; perPage?: number }) {
    const perPage = Math.max(1, Math.min(params?.perPage ?? 50, 1000));
    const page = Math.max(1, params?.page ?? 1);
    try {
      const result = await getDb().execute({
        sql: `SELECT ${USER_COLUMNS} FROM users ORDER BY created_at ASC LIMIT ? OFFSET ?`,
        args: [perPage, (page - 1) * perPage],
      });
      const users = result.rows.map((row) => toUser(row as unknown as Record<string, unknown>));
      return { data: { users }, error: null as AuthError | null };
    } catch (error) {
      return {
        data: { users: [] as AuthUser[] },
        error: { message: error instanceof Error ? error.message : "Falha ao listar usuários." } as AuthError | null,
      };
    }
  },

  async getUserById(id: string) {
    try {
      const user = await findUserById(id);
      if (!user) {
        return {
          data: { user: null as AuthUser | null },
          error: { message: "User not found", code: "user_not_found", status: 404 } as AuthError | null,
        };
      }
      return { data: { user: user as AuthUser | null }, error: null as AuthError | null };
    } catch (error) {
      return {
        data: { user: null as AuthUser | null },
        error: { message: error instanceof Error ? error.message : "Falha ao buscar usuário." } as AuthError | null,
      };
    }
  },

  async createUser(input: CreateUserInput) {
    const email = input.email.trim().toLowerCase();
    try {
      if (await findUserByEmail(email)) {
        return {
          data: { user: null as AuthUser | null },
          error: {
            message: "A user with this email address has already been registered",
            code: "email_exists",
            status: 422,
          } as AuthError | null,
        };
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await getDb().execute({
        sql: `INSERT INTO users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          email,
          input.password ? await hashPassword(input.password) : null,
          input.email_confirm ? now : null,
          JSON.stringify(input.app_metadata ?? {}),
          JSON.stringify(input.user_metadata ?? {}),
          now,
          now,
        ],
      });
      const user = await findUserById(id);
      return { data: { user }, error: null as AuthError | null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao criar usuário.";
      const duplicate = /UNIQUE/i.test(message);
      return {
        data: { user: null as AuthUser | null },
        error: {
          message: duplicate ? "A user with this email address has already been registered" : message,
          code: duplicate ? "email_exists" : undefined,
        } as AuthError | null,
      };
    }
  },

  async updateUserById(id: string, input: UpdateUserInput) {
    try {
      const current = await findUserById(id);
      if (!current) {
        return {
          data: { user: null as AuthUser | null },
          error: { message: "User not found", code: "user_not_found", status: 404 } as AuthError | null,
        };
      }

      const sets: string[] = [];
      const args: unknown[] = [];

      if (input.email) {
        sets.push("email = ?");
        args.push(input.email.trim().toLowerCase());
      }
      if (input.password) {
        sets.push("encrypted_password = ?");
        args.push(await hashPassword(input.password));
      }
      if (input.email_confirm) {
        sets.push("email_confirmed_at = COALESCE(email_confirmed_at, ?)");
        args.push(new Date().toISOString());
      }
      if (input.app_metadata) {
        sets.push("raw_app_meta_data = ?");
        args.push(JSON.stringify({ ...current.app_metadata, ...input.app_metadata }));
      }
      if (input.user_metadata) {
        sets.push("raw_user_meta_data = ?");
        args.push(JSON.stringify({ ...current.user_metadata, ...input.user_metadata }));
      }

      if (sets.length > 0) {
        sets.push("updated_at = ?");
        args.push(normalizeTimestamp(new Date()));
        args.push(id);
        await getDb().execute({ sql: `UPDATE users SET ${sets.join(", ")} WHERE id = ?`, args: args as never[] });
      }

      const user = await findUserById(id);
      return { data: { user }, error: null as AuthError | null };
    } catch (error) {
      return {
        data: { user: null as AuthUser | null },
        error: { message: error instanceof Error ? error.message : "Falha ao atualizar usuário." } as AuthError | null,
      };
    }
  },

  async deleteUser(id: string) {
    try {
      // profiles, push_subscriptions, etc. cascade from users via foreign keys.
      await getDb().execute({ sql: "DELETE FROM users WHERE id = ?", args: [id] });
      return { data: { user: null }, error: null as AuthError | null };
    } catch (error) {
      return {
        data: { user: null },
        error: { message: error instanceof Error ? error.message : "Falha ao remover usuário." } as AuthError | null,
      };
    }
  },
};

export type AuthAdmin = typeof authAdmin;
