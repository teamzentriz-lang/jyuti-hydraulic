import dotenv from "dotenv";
dotenv.config();
import { getDb } from "../src/db/index";

async function main() {
  const db = getDb();
  const tables = await db.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'ss_flow';");
  console.log("ss_flow tables:", tables);
}
main().catch(console.error);
