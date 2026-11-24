import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function main() {
  const db = getDb();
  const r = await db.execute(sql`
    select path,
           length(body) as body_len,
           left(body, 1200) as body
    from location_pages
    where path = 'city/15-hp-hydraulic-power-pack-manufacturers-in-chhota-udaipur'
    limit 1
  `);
  const short = await db.execute(sql`
    select count(*)::int as short_count
    from location_pages
    where length(regexp_replace(coalesce(body, ''), '<[^>]+>', ' ', 'g')) < 80
  `);
  const elementor = await db.execute(sql`
    select count(*)::int as elementor_count
    from location_pages
    where body ilike '%elementor%'
  `);
  const imgs = await db.execute(sql`
    select count(*)::int as img_count
    from location_pages
    where body ilike '%<img%'
  `);
  console.log(JSON.stringify((r as { rows?: unknown }).rows ?? r, null, 2));
  console.log(JSON.stringify((short as { rows?: unknown }).rows ?? short, null, 2));
  console.log(JSON.stringify((elementor as { rows?: unknown }).rows ?? elementor, null, 2));
  console.log(JSON.stringify((imgs as { rows?: unknown }).rows ?? imgs, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
