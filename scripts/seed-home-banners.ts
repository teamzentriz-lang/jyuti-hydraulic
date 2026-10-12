import { config } from "dotenv";
import { asc, eq } from "drizzle-orm";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const banners = [
  {
    filename: "power-packs.jpg",
    alt: "Hydraulic power packs for industrial applications",
    mimeType: "image/jpeg",
    size: 295141,
    storageKey: "public/brand/banners/power-packs.jpg",
    url: "/brand/banners/power-packs.jpg",
  },
  {
    filename: "cylinders.jpg",
    alt: "Jyoti Hydraulic cylinders for industrial machinery",
    mimeType: "image/jpeg",
    size: 260398,
    storageKey: "public/brand/banners/cylinders.jpg",
    url: "/brand/banners/cylinders.jpg",
  },
  {
    filename: "screw-jacks.png",
    alt: "Industrial screw jacks by Jyoti Hydraulic",
    mimeType: "image/png",
    size: 121803,
    storageKey: "public/brand/banners/screw-jacks.png",
    url: "/brand/banners/screw-jacks.png",
  },
  {
    filename: "products.png",
    alt: "Jyoti Hydraulic industrial product range",
    mimeType: "image/png",
    size: 219783,
    storageKey: "public/brand/banners/products.png",
    url: "/brand/banners/products.png",
  },
] as const;

async function main() {
  const { closeDb, getDb } = await import("../src/db");
  const { homeHeroImages, media } = await import("../src/db/schema");
  const db = getDb();

  const mediaIds: string[] = [];
  for (const banner of banners) {
    const [existing] = await db
      .select({ id: media.id })
      .from(media)
      .where(eq(media.storageKey, banner.storageKey))
      .limit(1);
    if (existing) {
      mediaIds.push(existing.id);
      continue;
    }
    const [created] = await db
      .insert(media)
      .values({ ...banner, storageDriver: "local", folder: "home-banners" })
      .returning({ id: media.id });
    if (created) mediaIds.push(created.id);
  }

  const current = await db
    .select({ id: homeHeroImages.id })
    .from(homeHeroImages)
    .orderBy(asc(homeHeroImages.sortOrder));
  if (!current.length && mediaIds.length) {
    await db.insert(homeHeroImages).values(
      mediaIds.map((mediaId, sortOrder) => ({ mediaId, sortOrder })),
    );
    console.log(`Registered ${mediaIds.length} homepage banners in the CMS.`);
  } else {
    console.log(`CMS already controls ${current.length} homepage banners.`);
  }

  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
