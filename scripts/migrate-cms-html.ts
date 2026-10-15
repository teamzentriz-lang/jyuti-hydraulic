import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured.");
  const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  await db.begin(async (tx) => {
    await tx.unsafe(`ALTER TABLE contact_settings
      ADD COLUMN IF NOT EXISTS email_secondary text NOT NULL DEFAULT 'jyotihydraulic@gmail.com',
      ADD COLUMN IF NOT EXISTS details_eyebrow text NOT NULL DEFAULT 'Reach the team',
      ADD COLUMN IF NOT EXISTS details_title text NOT NULL DEFAULT 'We are ready to help',
      ADD COLUMN IF NOT EXISTS form_title text NOT NULL DEFAULT 'Request a Quote',
      ADD COLUMN IF NOT EXISTS form_description text NOT NULL DEFAULT 'Fill in the details and our team will get back to you shortly.'`);
    await tx.unsafe(`UPDATE contact_settings
      SET email_secondary = 'jyotihydraulic@gmail.com'
      WHERE id = 'default' AND btrim(coalesce(email_secondary, '')) = ''`);
    await tx.unsafe(`UPDATE site_settings
      SET email_secondary = 'jyotihydraulic@gmail.com'
      WHERE id = 'default' AND btrim(coalesce(email_secondary, '')) = ''`);
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS site_html_settings (
      id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
      common_header_html text NOT NULL DEFAULT '',
      common_footer_html text NOT NULL DEFAULT '',
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await tx.unsafe(
      `INSERT INTO site_html_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING`,
    );
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS page_html_overrides (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      path text NOT NULL UNIQUE,
      header_html text NOT NULL DEFAULT '',
      footer_html text NOT NULL DEFAULT '',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await tx.unsafe(
      `CREATE TABLE IF NOT EXISTS site_ui_settings (id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'), labels jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now())`,
    );
    await tx.unsafe(
      `INSERT INTO site_ui_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING`,
    );
  });
  console.log("CMS HTML and contact-email schema applied.");
  await db.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
