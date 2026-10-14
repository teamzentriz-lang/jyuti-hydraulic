import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  await sql.begin(async (tx) => {
    for (const statement of [
      `DO $$ BEGIN CREATE TYPE crm_visibility AS ENUM ('own','assigned','team','all'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE lead_stage AS ENUM ('new','assigned','contacted','qualified','follow_up','proposal','negotiation','won','lost','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE crm_priority AS ENUM ('low','normal','high','urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE activity_type AS ENUM ('call','email','meeting','note','status_change','assignment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE task_status AS ENUM ('pending','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS crm_visibility crm_visibility NOT NULL DEFAULT 'assigned'`,
      `UPDATE users SET crm_visibility = 'all' WHERE system_role = 'super_admin'`,
      `ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS priority crm_priority NOT NULL DEFAULT 'normal'`,
      `ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS assigned_to_id uuid REFERENCES users(id) ON DELETE SET NULL`,
      `ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL`,
      `ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz`,
      `ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS converted_lead_id uuid`,
      `CREATE INDEX IF NOT EXISTS inquiries_assignee_idx ON inquiries(assigned_to_id,status)`,
      `CREATE INDEX IF NOT EXISTS inquiries_team_idx ON inquiries(team_id,status)`,
      `CREATE TABLE IF NOT EXISTS companies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, industry text NOT NULL DEFAULT '', website text, email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '', is_active boolean NOT NULL DEFAULT true, owner_id uuid REFERENCES users(id) ON DELETE SET NULL, team_id uuid REFERENCES teams(id) ON DELETE SET NULL, created_by_id uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
      `CREATE INDEX IF NOT EXISTS companies_owner_idx ON companies(owner_id)`,
      `CREATE INDEX IF NOT EXISTS companies_team_idx ON companies(team_id)`,
      `CREATE INDEX IF NOT EXISTS companies_name_idx ON companies(name)`,
      `CREATE TABLE IF NOT EXISTS contacts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE SET NULL, name text NOT NULL, email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', designation text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '', is_active boolean NOT NULL DEFAULT true, owner_id uuid REFERENCES users(id) ON DELETE SET NULL, team_id uuid REFERENCES teams(id) ON DELETE SET NULL, created_by_id uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
      `CREATE INDEX IF NOT EXISTS contacts_owner_idx ON contacts(owner_id)`,
      `CREATE INDEX IF NOT EXISTS contacts_team_idx ON contacts(team_id)`,
      `CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts(email)`,
      `CREATE TABLE IF NOT EXISTS leads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inquiry_id uuid UNIQUE REFERENCES inquiries(id) ON DELETE SET NULL, company_id uuid REFERENCES companies(id) ON DELETE SET NULL, contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL, title text NOT NULL, description text NOT NULL DEFAULT '', stage lead_stage NOT NULL DEFAULT 'new', priority crm_priority NOT NULL DEFAULT 'normal', estimated_value integer, owner_id uuid REFERENCES users(id) ON DELETE SET NULL, team_id uuid REFERENCES teams(id) ON DELETE SET NULL, next_follow_up_at timestamptz, lost_reason text NOT NULL DEFAULT '', closed_at timestamptz, created_by_id uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
      `CREATE INDEX IF NOT EXISTS leads_stage_idx ON leads(stage,updated_at)`,
      `CREATE INDEX IF NOT EXISTS leads_owner_idx ON leads(owner_id,stage)`,
      `CREATE INDEX IF NOT EXISTS leads_team_idx ON leads(team_id,stage)`,
      `CREATE TABLE IF NOT EXISTS lead_activities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE, type activity_type NOT NULL DEFAULT 'note', subject text NOT NULL DEFAULT '', details text NOT NULL DEFAULT '', occurred_at timestamptz NOT NULL DEFAULT now(), next_action_at timestamptz, created_by_id uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now())`,
      `CREATE INDEX IF NOT EXISTS lead_activities_lead_idx ON lead_activities(lead_id,occurred_at)`,
      `CREATE TABLE IF NOT EXISTS follow_up_tasks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE, title text NOT NULL, description text NOT NULL DEFAULT '', due_at timestamptz NOT NULL, status task_status NOT NULL DEFAULT 'pending', priority crm_priority NOT NULL DEFAULT 'normal', assigned_to_id uuid REFERENCES users(id) ON DELETE SET NULL, team_id uuid REFERENCES teams(id) ON DELETE SET NULL, completed_at timestamptz, created_by_id uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
      `CREATE INDEX IF NOT EXISTS follow_up_tasks_due_idx ON follow_up_tasks(status,due_at)`,
      `CREATE INDEX IF NOT EXISTS follow_up_tasks_assignee_idx ON follow_up_tasks(assigned_to_id,status)`,
      `CREATE INDEX IF NOT EXISTS follow_up_tasks_team_idx ON follow_up_tasks(team_id,status)`,
      `DO $$ BEGIN ALTER TABLE inquiries ADD CONSTRAINT inquiries_converted_lead_id_fk FOREIGN KEY (converted_lead_id) REFERENCES leads(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    ]) await tx.unsafe(statement);
  });
  console.log("Phase 2 CRM migration applied.");
  await sql.end();
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
