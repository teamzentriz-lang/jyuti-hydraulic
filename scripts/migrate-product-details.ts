import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  try {
    await db.begin(async (tx) => {
      await tx.unsafe(`
        ALTER TABLE products
          ADD COLUMN IF NOT EXISTS rating integer,
          ADD COLUMN IF NOT EXISTS shipping_area text;
      `);
    });
    console.log("Product detail fields are ready.");
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
