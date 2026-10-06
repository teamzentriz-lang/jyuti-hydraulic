import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { DatabaseNotConfiguredError } from "@/db/errors";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __jhSql?: ReturnType<typeof postgres>;
  __jhDb?: AppDatabase;
};

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): AppDatabase {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseNotConfiguredError();

  if (!globalForDb.__jhDb) {
    const sql = postgres(url, {
      prepare: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 15,
    });
    globalForDb.__jhSql = sql;
    globalForDb.__jhDb = drizzle(sql, { schema });
  }

  return globalForDb.__jhDb;
}

export async function closeDb() {
  await globalForDb.__jhSql?.end({ timeout: 5 });
  globalForDb.__jhSql = undefined;
  globalForDb.__jhDb = undefined;
}
