import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  const columns = await sql<{ column_name: string }[]>`
    select column_name
    from information_schema.columns
    where table_schema = 'public' and table_name = 'users'
    order by ordinal_position
  `;
  const tables = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_name in ('teams', 'team_members', 'audit_logs')
    order by table_name
  `;
  const requiredColumns = ["system_role", "status", "permission_overrides", "last_login_at", "deactivated_at"];
  const columnNames = new Set(columns.map((row) => row.column_name));
  const tableNames = new Set(tables.map((row) => row.table_name));
  const missing = [
    ...requiredColumns.filter((name) => !columnNames.has(name)).map((name) => `users.${name}`),
    ...["teams", "team_members", "audit_logs"].filter((name) => !tableNames.has(name)),
  ];
  if (missing.length) {
    let migrations: unknown[] = [];
    try {
      migrations = await sql.unsafe("select id, hash, created_at from drizzle.__drizzle_migrations order by created_at");
    } catch {
      // Migration metadata may not exist on a fresh database.
    }
    console.error("Recorded migrations:", migrations);
    throw new Error(`Phase 1 schema is incomplete: ${missing.join(", ")}`);
  }
  const roles = await sql<{ system_role: string; status: string; count: number }[]>`
    select system_role::text, status::text, count(*)::int as count
    from users
    group by system_role, status
    order by system_role, status
  `;
  console.log("Phase 1 schema verified.");
  console.log("Account summary:", roles);
  await sql.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
