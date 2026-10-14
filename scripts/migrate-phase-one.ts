import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

  await sql.begin(async (tx) => {
    await tx.unsafe(`DO $$ BEGIN
      CREATE TYPE system_role AS ENUM ('super_admin', 'admin', 'staff');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await tx.unsafe(`DO $$ BEGIN
      CREATE TYPE account_status AS ENUM ('active', 'inactive');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await tx.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS system_role system_role NOT NULL DEFAULT 'staff'`);
    await tx.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status account_status NOT NULL DEFAULT 'active'`);
    await tx.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_overrides jsonb NOT NULL DEFAULT '[]'::jsonb`);
    await tx.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz`);
    await tx.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at timestamptz`);
    await tx.unsafe(`UPDATE users SET system_role = CASE WHEN role = 'admin' THEN 'super_admin'::system_role ELSE system_role END`);
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS teams (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
      description text NOT NULL DEFAULT '', is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await tx.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS teams_name_unique ON teams(name)`);
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS team_members (
      team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(team_id, user_id)
    )`);
    await tx.unsafe(`CREATE INDEX IF NOT EXISTS team_members_user_idx ON team_members(user_id)`);
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
      action text NOT NULL, entity_type text NOT NULL, entity_id text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await tx.unsafe(`CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id)`);
    await tx.unsafe(`CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor_id, created_at)`);
  });

  console.log("Phase 1 access-control migration applied.");
  await sql.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
