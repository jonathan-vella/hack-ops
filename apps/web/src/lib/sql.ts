import sql from "mssql";
import { DefaultAzureCredential } from "@azure/identity";

let pool: sql.ConnectionPool | null = null;
let tokenExpiresAt = 0;

function isLocalDev(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
  );
}

/**
 * Acquire an Entra ID access token for Azure SQL Database.
 * Returns a static key for local development when SQL_PASSWORD is set.
 */
async function getAccessToken(): Promise<{ token: string; expiresAt: number }> {
  const credential = new DefaultAzureCredential();
  const response = await credential.getToken(
    "https://database.windows.net/.default",
  );
  return { token: response.token, expiresAt: response.expiresOnTimestamp };
}

/**
 * Get or create a connection pool to Azure SQL Database.
 * Handles Entra token refresh automatically — reconnects when the token
 * is within 60 seconds of expiry.
 *
 * Local dev: uses SQL_PASSWORD env var with SQL auth (for testing against
 * a local SQL Server or Azure SQL with password auth enabled).
 */
async function getPool(): Promise<sql.ConnectionPool> {
  const now = Date.now();

  if (pool?.connected && now < tokenExpiresAt - 60_000) {
    return pool;
  }

  if (pool) {
    await pool.close().catch(() => {});
    pool = null;
  }

  const server = process.env.SQL_SERVER;
  const database = process.env.SQL_DATABASE ?? "hackops-db";

  if (!server) {
    throw new Error("SQL_SERVER environment variable is required");
  }

  const config: sql.config = {
    server,
    database,
    options: {
      encrypt: true,
      trustServerCertificate: isLocalDev(),
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };

  if (isLocalDev() && process.env.SQL_PASSWORD) {
    config.user = process.env.SQL_USER ?? "sa";
    config.password = process.env.SQL_PASSWORD;
    tokenExpiresAt = Date.now() + 3_600_000;
  } else {
    const { token, expiresAt } = await getAccessToken();
    tokenExpiresAt = expiresAt;
    config.authentication = {
      type: "azure-active-directory-access-token" as const,
      options: {
        token,
      },
    };
  }

  pool = new sql.ConnectionPool(config);
  await pool.connect();
  return pool;
}

/**
 * Execute a parameterized SELECT query and return typed rows.
 *
 * Parameters use `@name` placeholders in the SQL string and a flat
 * `Record<string, unknown>` for values. Types are inferred automatically.
 *
 * @example
 * ```ts
 * const rows = await query<Team>(
 *   "SELECT * FROM teams WHERE hackathonId = @hid ORDER BY name",
 *   { hid: hackathonId }
 * );
 * ```
 */
export async function query<T>(
  sqlText: string,
  params?: Record<string, unknown>,
): Promise<T[]> {
  const p = await getPool();
  const request = p.request();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }
  const result = await request.query<T>(sqlText);
  return result.recordset;
}

/**
 * Execute a parameterized SELECT and return the first row or null.
 */
export async function queryOne<T>(
  sqlText: string,
  params?: Record<string, unknown>,
): Promise<T | null> {
  const rows = await query<T>(sqlText, params);
  return rows[0] ?? null;
}

/**
 * Execute a parameterized INSERT, UPDATE, or DELETE statement.
 * Returns the number of rows affected.
 */
export async function execute(
  sqlText: string,
  params?: Record<string, unknown>,
): Promise<number> {
  const p = await getPool();
  const request = p.request();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }
  const result = await request.query(sqlText);
  return result.rowsAffected[0] ?? 0;
}

/**
 * Execute multiple statements within a single transaction.
 * Rolls back on any error.
 *
 * @example
 * ```ts
 * await transaction(async (tx) => {
 *   await tx.execute("INSERT INTO teams ...", { ... });
 *   await tx.execute("UPDATE hackers SET teamId = @tid ...", { ... });
 * });
 * ```
 */
export async function transaction(
  fn: (tx: TransactionContext) => Promise<void>,
): Promise<void> {
  const p = await getPool();
  const txn = new sql.Transaction(p);
  await txn.begin();

  const ctx: TransactionContext = {
    async query<T>(
      sqlText: string,
      params?: Record<string, unknown>,
    ): Promise<T[]> {
      const request = new sql.Request(txn);
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          request.input(key, value);
        }
      }
      const result = await request.query<T>(sqlText);
      return result.recordset;
    },
    async queryOne<T>(
      sqlText: string,
      params?: Record<string, unknown>,
    ): Promise<T | null> {
      const rows = await ctx.query<T>(sqlText, params);
      return rows[0] ?? null;
    },
    async execute(
      sqlText: string,
      params?: Record<string, unknown>,
    ): Promise<number> {
      const request = new sql.Request(txn);
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          request.input(key, value);
        }
      }
      const result = await request.query(sqlText);
      return result.rowsAffected[0] ?? 0;
    },
  };

  try {
    await fn(ctx);
    await txn.commit();
  } catch (err) {
    await txn.rollback();
    throw err;
  }
}

export interface TransactionContext {
  query<T>(sqlText: string, params?: Record<string, unknown>): Promise<T[]>;
  queryOne<T>(
    sqlText: string,
    params?: Record<string, unknown>,
  ): Promise<T | null>;
  execute(sqlText: string, params?: Record<string, unknown>): Promise<number>;
}
