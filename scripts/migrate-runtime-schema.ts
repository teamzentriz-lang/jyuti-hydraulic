import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  await db.begin(async (tx) => {
    await tx.unsafe(`ALTER TABLE home_content
      ADD COLUMN IF NOT EXISTS client_logos jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS testimonials jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS stats jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS usps jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS custom_band_title text NOT NULL DEFAULT 'Custom Hydraulic Solutions for Every Industry',
      ADD COLUMN IF NOT EXISTS custom_band_eyebrow text NOT NULL DEFAULT 'Made around your application',
      ADD COLUMN IF NOT EXISTS custom_band_body text NOT NULL DEFAULT 'From standard power packs to fully customized systems, our team designs and manufactures equipment that meets your exact requirements.',
      ADD COLUMN IF NOT EXISTS custom_band_button_text text NOT NULL DEFAULT 'Get a custom solution',
      ADD COLUMN IF NOT EXISTS custom_band_button_href text NOT NULL DEFAULT '/contact/'`);
    await tx.unsafe(`ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS subtitle text NOT NULL DEFAULT 'ISO-9001:2015 Certified Company'`);
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS media_blobs (
      media_id uuid PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
      data_base64 text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  });
  console.log("Runtime DDL moved to migration and schema applied.");
  await db.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
