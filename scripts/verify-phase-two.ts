import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  const tables = await sql<{ table_name: string }[]>`select table_name from information_schema.tables where table_schema='public' and table_name in ('companies','contacts','leads','lead_activities','follow_up_tasks')`;
  const inquiryColumns = await sql<{ column_name: string }[]>`select column_name from information_schema.columns where table_schema='public' and table_name='inquiries'`;
  const userColumns = await sql<{ column_name: string }[]>`select column_name from information_schema.columns where table_schema='public' and table_name='users'`;
  const requiredTables = ["companies", "contacts", "leads", "lead_activities", "follow_up_tasks"];
  const requiredInquiryColumns = ["priority", "assigned_to_id", "team_id", "next_follow_up_at", "converted_lead_id"];
  const missing = [
    ...requiredTables.filter((name) => !tables.some((row) => row.table_name === name)),
    ...requiredInquiryColumns.filter((name) => !inquiryColumns.some((row) => row.column_name === name)).map((name) => `inquiries.${name}`),
    ...(!userColumns.some((row) => row.column_name === "crm_visibility") ? ["users.crm_visibility"] : []),
  ];
  if (missing.length) throw new Error(`Phase 2 schema is incomplete: ${missing.join(", ")}`);
  const superAdmins = await sql<{ count: number }[]>`select count(*)::int as count from users where system_role='super_admin' and status='active' and crm_visibility='all'`;
  if ((superAdmins[0]?.count ?? 0) < 1) throw new Error("No active Super Admin has full CRM visibility.");
  console.log("Phase 2 CRM schema verified.");
  console.log(`Active Super Admins with full CRM visibility: ${superAdmins[0]?.count ?? 0}`);
  await sql.end();
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
