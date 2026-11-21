import dns from "node:dns";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { DatabaseNotConfiguredError } from "@/db/errors";

const globalForDns = globalThis as unknown as { __jhDnsHooked?: boolean };

if (!globalForDns.__jhDnsHooked) {
  globalForDns.__jhDnsHooked = true;
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {}

  const originalLookup = dns.lookup;
  // @ts-expect-error override lookup
  dns.lookup = function (hostname: any, options: any, callback: any) {
    const cb = typeof options === "function" ? options : callback;
    const opts = typeof options === "function" ? {} : options;

    originalLookup(hostname, opts, (err: any, address: any, family: any) => {
      if (!err && address) {
        return cb(null, address, family);
      }
      if (
        typeof hostname === "string" &&
        (err?.code === "ENOTFOUND" || err?.code === "EAI_AGAIN")
      ) {
        dns.resolve4(hostname, (resErr, addrs) => {
          if (!resErr && addrs && addrs.length > 0) {
            if (opts && opts.all) {
              return cb(
                null,
                addrs.map((a) => ({ address: a, family: 4 })),
              );
            }
            return cb(null, addrs[0], 4);
          }
          cb(err, address, family);
        });
        return;
      }
      cb(err, address, family);
    });
  };
}

export type AppDatabase = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __jhSql?: ReturnType<typeof postgres>;
  __jhDb?: AppDatabase;
};

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function connectionString(raw: string) {
  return raw
    .replace(/([?&])channel_binding=[^&]*/g, "")
    .replace("?&", "?")
    .replace(/[?&]$/, "");
}

export function getDb(): AppDatabase {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseNotConfiguredError();

  if (!globalForDb.__jhDb) {
    const sql = postgres(connectionString(url), {
      prepare: false,
      max: process.env.VERCEL ? 5 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
      backoff: (attempt) => Math.min(0.25 * 2 ** attempt, 2),
    });
    globalForDb.__jhSql = sql;
    globalForDb.__jhDb = drizzle(sql, { schema });
  }

  return globalForDb.__jhDb;
}

function transientConnectionError(error: unknown) {
  let current: unknown = error;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (typeof current !== "object") break;
    const value = current as {
      code?: string;
      message?: string;
      cause?: unknown;
    };
    if (
      [
        "ENOTFOUND",
        "EAI_AGAIN",
        "ECONNRESET",
        "ETIMEDOUT",
        "CONNECTION_CLOSED",
      ].includes(value.code ?? "")
    )
      return true;
    if (
      /getaddrinfo|connection (?:closed|terminated)|timeout/i.test(
        value.message ?? "",
      )
    )
      return true;
    current = value.cause;
  }
  return false;
}

export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!transientConnectionError(error) || attempt === attempts - 1)
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
  throw lastError;
}

export async function closeDb() {
  await globalForDb.__jhSql?.end({ timeout: 5 });
  globalForDb.__jhSql = undefined;
  globalForDb.__jhDb = undefined;
}
