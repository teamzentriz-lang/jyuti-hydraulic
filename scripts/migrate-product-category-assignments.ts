import { config } from "dotenv";
import postgres from "postgres";

async function main() {
  config({ path: ".env" });
  config({ path: ".env.local", override: true });
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  try {
    await db.unsafe(`
    CREATE TABLE IF NOT EXISTS product_category_assignments (
      product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      category_id uuid NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
      sort_order integer NOT NULL DEFAULT 0,
      PRIMARY KEY (product_id, category_id)
    );
    `);
    await db.unsafe(`
    CREATE INDEX IF NOT EXISTS product_category_assignments_category_idx
    ON product_category_assignments(category_id, sort_order);
    `);
    await db.unsafe(`
    INSERT INTO product_category_assignments (product_id, category_id, sort_order)
    SELECT id, category_id, 0 FROM products WHERE category_id IS NOT NULL
    ON CONFLICT DO NOTHING;
    `);
    await db.unsafe(`
    INSERT INTO product_category_assignments (product_id, category_id, sort_order)
    SELECT id, sub_category_id, 1 FROM products WHERE sub_category_id IS NOT NULL
    ON CONFLICT DO NOTHING;
    `);
    console.log("Product category assignments migration complete.");
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
