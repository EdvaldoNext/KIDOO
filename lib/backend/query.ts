/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InStatement, ResultSet } from "@libsql/client";
import { getDb } from "@/lib/backend/db";
import { POLICIES, type Scope } from "@/lib/backend/policies";
import { TABLES, deserializeRow, normalizeTimestamp, serializeValue, type TableMeta } from "@/lib/backend/tables";

/**
 * A small query builder that speaks the same dialect the app already used with
 * supabase-js (.from().select().eq()... / .insert() / .update() / .upsert() / .delete()),
 * but runs against Turso (libSQL). Results keep the `{ data, error, count }` shape.
 */

export type DbError = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

export type DbResult<T = any> = {
  data: T;
  error: DbError | null;
  count: number | null;
};

export type ScopeResolver = () => Promise<Scope>;

type Action = "select" | "insert" | "update" | "delete" | "upsert";
type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "is" | "like" | "ilike";

type Filter = { col: string; op: FilterOp; val: unknown; negate: boolean };
type Order = { col: string; ascending: boolean };

const IDENT = /^[a-z_][a-z0-9_]*$/i;

class QueryError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

export function toDbError(error: unknown): DbError {
  if (error instanceof QueryError) return { message: error.message, code: error.code };

  const raw = error instanceof Error ? error.message : String(error);
  const unique = /UNIQUE constraint failed: ([\w.,\s]+)/i.exec(raw);
  if (unique) {
    return {
      message: `duplicate key value violates unique constraint (${unique[1].trim()})`,
      code: "23505",
      details: raw,
    };
  }
  if (/FOREIGN KEY constraint failed/i.test(raw)) {
    return { message: "insert or update violates foreign key constraint", code: "23503", details: raw };
  }
  const check = /CHECK constraint failed: ([\w.\s]+)/i.exec(raw);
  if (check) {
    return { message: `new row violates check constraint (${check[1].trim()})`, code: "23514", details: raw };
  }
  const notNull = /NOT NULL constraint failed: ([\w.]+)/i.exec(raw);
  if (notNull) {
    return { message: `null value in column violates not-null constraint (${notNull[1]})`, code: "23502", details: raw };
  }
  return { message: raw };
}

function tableMeta(table: string): TableMeta {
  const meta = TABLES[table];
  if (!meta) throw new QueryError(`relation "${table}" does not exist`, "42P01");
  return meta;
}

function checkColumn(meta: TableMeta, table: string, column: string) {
  if (!IDENT.test(column) || !meta.columns.includes(column)) {
    throw new QueryError(`column ${table}.${column} does not exist`, "42703");
  }
}

function rowsToObjects(result: ResultSet, meta: TableMeta) {
  return result.rows.map((row) => {
    const object: Record<string, unknown> = {};
    for (const column of result.columns) {
      object[column] = (row as any)[column];
    }
    return deserializeRow(meta, object);
  });
}

function filterValue(meta: TableMeta, column: string, value: unknown) {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (meta.ts?.includes(column) && value != null) return normalizeTimestamp(value);
  if (value instanceof Date) return value.toISOString();
  return value;
}

/**
 * `D` is the type of `data` when awaited: a list of rows by default, `any` after
 * `.single()` / `.maybeSingle()` (same ergonomics the untyped supabase-js client had).
 */
export class QueryBuilder<D = any[] | null> implements PromiseLike<DbResult<D>> {
  private action: Action = "select";
  private columns: string | null = null;
  private returning = false;
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitCount: number | null = null;
  private wantCount = false;
  private head = false;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private rows: Record<string, unknown>[] = [];
  private patch: Record<string, unknown> = {};
  private conflict: string[] | null = null;

  constructor(
    private readonly table: string,
    private readonly scope: ScopeResolver | null,
  ) {}

  // -- verbs ---------------------------------------------------------------

  select(columns = "*", options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    if (this.action === "select") {
      this.columns = columns;
    } else {
      this.returning = true;
      this.columns = columns;
    }
    if (options?.count) this.wantCount = true;
    if (options?.head) this.head = true;
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.action = "insert";
    this.rows = Array.isArray(values) ? values : [values];
    return this;
  }

  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ) {
    this.action = "upsert";
    this.rows = Array.isArray(values) ? values : [values];
    this.conflict = options?.onConflict ? options.onConflict.split(",").map((part) => part.trim()) : null;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.action = "update";
    this.patch = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  // -- filters -------------------------------------------------------------

  eq(col: string, val: unknown) {
    return this.addFilter(col, "eq", val);
  }
  neq(col: string, val: unknown) {
    return this.addFilter(col, "neq", val);
  }
  gt(col: string, val: unknown) {
    return this.addFilter(col, "gt", val);
  }
  gte(col: string, val: unknown) {
    return this.addFilter(col, "gte", val);
  }
  lt(col: string, val: unknown) {
    return this.addFilter(col, "lt", val);
  }
  lte(col: string, val: unknown) {
    return this.addFilter(col, "lte", val);
  }
  like(col: string, val: string) {
    return this.addFilter(col, "like", val);
  }
  ilike(col: string, val: string) {
    return this.addFilter(col, "ilike", val);
  }
  in(col: string, val: readonly unknown[]) {
    return this.addFilter(col, "in", val);
  }
  is(col: string, val: null | boolean) {
    return this.addFilter(col, "is", val);
  }
  not(col: string, op: string, val: unknown) {
    return this.addFilter(col, op as FilterOp, val, true);
  }

  private addFilter(col: string, op: FilterOp, val: unknown, negate = false) {
    this.filters.push({ col, op, val, negate });
    return this;
  }

  // -- modifiers -----------------------------------------------------------

  order(col: string, options?: { ascending?: boolean }) {
    this.orders.push({ col, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single(): QueryBuilder<any> {
    this.mode = "single";
    return this as unknown as QueryBuilder<any>;
  }

  maybeSingle(): QueryBuilder<any> {
    this.mode = "maybeSingle";
    return this as unknown as QueryBuilder<any>;
  }

  // -- execution -----------------------------------------------------------

  then<TResult1 = DbResult<D>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<D>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return (this.execute() as Promise<DbResult<D>>).then(onfulfilled, onrejected);
  }

  private async execute(): Promise<DbResult> {
    try {
      return await this.run();
    } catch (error) {
      return { data: null, error: toDbError(error), count: null };
    }
  }

  private buildWhere(meta: TableMeta, extra: { sql: string; args: unknown[] } | null) {
    const clauses: string[] = [];
    const args: unknown[] = [];

    for (const filter of this.filters) {
      checkColumn(meta, this.table, filter.col);
      const column = filter.col;
      let clause: string;

      switch (filter.op) {
        case "in": {
          const list = (filter.val as unknown[]).map((value) => filterValue(meta, column, value));
          if (list.length === 0) {
            clause = "0";
          } else {
            clause = `${column} IN (${list.map(() => "?").join(", ")})`;
            args.push(...list);
          }
          break;
        }
        case "is": {
          if (filter.val === null) clause = `${column} IS NULL`;
          else {
            clause = `${column} IS ?`;
            args.push(filter.val ? 1 : 0);
          }
          break;
        }
        case "like":
        case "ilike":
          clause = `${column} LIKE ?`;
          args.push(filter.val);
          break;
        default: {
          const sqlOp = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" }[filter.op];
          if (!sqlOp) throw new QueryError(`unsupported filter operator "${filter.op}"`, "PGRST100");
          clause = `${column} ${sqlOp} ?`;
          args.push(filterValue(meta, column, filter.val));
        }
      }

      clauses.push(filter.negate ? `NOT (${clause})` : clause);
    }

    if (extra) {
      clauses.push(extra.sql);
      args.push(...extra.args);
    }

    return { sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "", args };
  }

  private async run(): Promise<DbResult> {
    const meta = tableMeta(this.table);
    const policy = POLICIES[this.table];
    let readable = meta.columns;
    let scopeWhere: { sql: string; args: unknown[] } | null = null;

    if (this.scope) {
      // User-scoped client: read-only, and only what the old RLS policies allowed.
      if (this.action !== "select") {
        throw new QueryError(`permission denied for table ${this.table}`, "42501");
      }
      if (!policy) throw new QueryError(`permission denied for table ${this.table}`, "42501");

      const rule = policy.read(await this.scope());
      if (rule.kind === "none") {
        return this.emptySelect();
      }
      if (rule.kind === "where") scopeWhere = { sql: rule.sql, args: rule.args };
      if (policy.readable) readable = policy.readable;
    }

    switch (this.action) {
      case "select":
        return this.runSelect(meta, readable, scopeWhere);
      case "insert":
      case "upsert":
        return this.runInsert(meta);
      case "update":
        return this.runUpdate(meta);
      case "delete":
        return this.runDelete(meta);
    }
  }

  private emptySelect(): DbResult {
    if (this.mode === "single") {
      return {
        data: null,
        error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
        count: null,
      };
    }
    return { data: this.mode === "maybeSingle" ? null : this.head ? null : [], error: null, count: this.wantCount ? 0 : null };
  }

  private selectColumns(meta: TableMeta, readable: string[]) {
    const requested = (this.columns ?? "*").trim();
    if (requested === "*") return readable;
    const list = requested
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const column of list) {
      checkColumn(meta, this.table, column);
      if (!readable.includes(column)) {
        throw new QueryError(`permission denied for column ${column} of relation ${this.table}`, "42501");
      }
    }
    return list;
  }

  private orderSql(meta: TableMeta) {
    if (this.orders.length === 0) return "";
    const parts = this.orders.map((order) => {
      checkColumn(meta, this.table, order.col);
      // Postgres default: NULLS LAST for ASC, NULLS FIRST for DESC.
      const direction = order.ascending ? "ASC" : "DESC";
      return `(${order.col} IS NULL) ${direction}, ${order.col} ${direction}`;
    });
    return ` ORDER BY ${parts.join(", ")}`;
  }

  private shapeRows(rows: Record<string, unknown>[], count: number | null): DbResult {
    if (this.mode === "single") {
      if (rows.length !== 1) {
        return {
          data: null,
          error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
          count,
        };
      }
      return { data: rows[0], error: null, count };
    }
    if (this.mode === "maybeSingle") {
      if (rows.length > 1) {
        return {
          data: null,
          error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
          count,
        };
      }
      return { data: rows[0] ?? null, error: null, count };
    }
    return { data: rows, error: null, count };
  }

  private async runSelect(
    meta: TableMeta,
    readable: string[],
    scopeWhere: { sql: string; args: unknown[] } | null,
  ): Promise<DbResult> {
    const db = getDb();
    const where = this.buildWhere(meta, scopeWhere);

    let count: number | null = null;
    if (this.wantCount) {
      const counted = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM ${this.table}${where.sql}`,
        args: where.args as never[],
      });
      count = Number((counted.rows[0] as any)?.n ?? 0);
      if (this.head) return { data: null, error: null, count };
    }

    const columns = this.selectColumns(meta, readable);
    const limit = this.mode === "single" || this.mode === "maybeSingle" ? Math.min(this.limitCount ?? 2, 2) : this.limitCount;
    const sql =
      `SELECT ${columns.join(", ")} FROM ${this.table}${where.sql}${this.orderSql(meta)}` +
      (limit != null ? ` LIMIT ${Math.max(0, Math.floor(limit))}` : "");

    const result = await db.execute({ sql, args: where.args as never[] });
    return this.shapeRows(rowsToObjects(result, meta), count);
  }

  private returningSql(meta: TableMeta) {
    if (!this.returning) return "";
    const requested = (this.columns ?? "*").trim();
    if (requested === "*") return ` RETURNING ${meta.columns.join(", ")}`;
    const list = requested
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const column of list) checkColumn(meta, this.table, column);
    return ` RETURNING ${list.join(", ")}`;
  }

  private finishWrite(results: ResultSet[], meta: TableMeta): DbResult {
    if (!this.returning) return { data: null, error: null, count: null };
    const rows = results.flatMap((result) => rowsToObjects(result, meta));
    return this.shapeRows(rows, null);
  }

  private async runInsert(meta: TableMeta): Promise<DbResult> {
    if (this.rows.length === 0) return { data: this.returning ? [] : null, error: null, count: null };

    const upsert = this.action === "upsert";
    const conflict = upsert ? (this.conflict ?? meta.pk) : null;
    if (conflict) for (const column of conflict) checkColumn(meta, this.table, column);

    const statements: InStatement[] = this.rows.map((row) => {
      const keys = Object.keys(row).filter((key) => row[key] !== undefined);
      for (const key of keys) checkColumn(meta, this.table, key);

      const returning = this.returningSql(meta);
      if (keys.length === 0) {
        return { sql: `INSERT INTO ${this.table} DEFAULT VALUES${returning}`, args: [] };
      }

      const args = keys.map((key) => serializeValue(meta, key, row[key]));
      let sql = `INSERT INTO ${this.table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
      if (upsert && conflict) {
        const updates = keys.filter((key) => !conflict.includes(key));
        sql +=
          updates.length > 0
            ? ` ON CONFLICT (${conflict.join(", ")}) DO UPDATE SET ${updates.map((key) => `${key} = excluded.${key}`).join(", ")}`
            : ` ON CONFLICT (${conflict.join(", ")}) DO NOTHING`;
      }
      return { sql: sql + returning, args: args as never[] };
    });

    const results = await getDb().batch(statements, "write");
    return this.finishWrite(results, meta);
  }

  private async runUpdate(meta: TableMeta): Promise<DbResult> {
    const keys = Object.keys(this.patch).filter((key) => this.patch[key] !== undefined);
    if (keys.length === 0) {
      throw new QueryError("update requires at least one column", "PGRST100");
    }
    for (const key of keys) checkColumn(meta, this.table, key);

    const where = this.buildWhere(meta, null);
    const sql =
      `UPDATE ${this.table} SET ${keys.map((key) => `${key} = ?`).join(", ")}${where.sql}${this.returningSql(meta)}`;
    const args = [...keys.map((key) => serializeValue(meta, key, this.patch[key])), ...where.args];

    const result = await getDb().execute({ sql, args: args as never[] });
    return this.finishWrite([result], meta);
  }

  private async runDelete(meta: TableMeta): Promise<DbResult> {
    const where = this.buildWhere(meta, null);
    const result = await getDb().execute({
      sql: `DELETE FROM ${this.table}${where.sql}${this.returningSql(meta)}`,
      args: where.args as never[],
    });
    return this.finishWrite([result], meta);
  }
}
