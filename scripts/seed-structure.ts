import { randomUUID } from "crypto";
import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import {
  skeletonCatalogue,
  skeletonFooterNav,
  skeletonHeaderNav,
  skeletonPages,
  skeletonPosts,
  type SkeletonCategory,
} from "../src/lib/site-skeleton";
import { homeDefaults, brand, aboutPillars } from "../src/lib/brand";
import { homeShowcasePaths } from "../src/lib/site-skeleton";

const PLACEHOLDER_IMAGE = "/placeholders/product.svg";

async function upsertPage(
  tx: Awaited<ReturnType<typeof import("../src/db").getDb>> extends infer D
    ? D extends { transaction: (fn: (t: infer T) => Promise<void>) => Promise<void> }
      ? T
      : never
    : never,
  input: { title: string; slug: string; path: string; body: string },
) {
  const { pages } = await import("../src/db/schema");
  const { reserveRoute } = await import("../src/lib/cms/routes");
  const [existing] = await tx.select({ id: pages.id }).from(pages).where(eq(pages.slug, input.slug)).limit(1);
  const id = existing?.id ?? randomUUID();
  const values = {
    title: input.title,
    slug: input.slug,
    path: input.path,
    body: input.body,
    status: "published" as const,
    updatedAt: new Date(),
  };
  if (existing) {
    await tx.update(pages).set(values).where(eq(pages.id, id));
  } else {
    await tx.insert(pages).values({ id, ...values });
  }
  await reserveRoute(tx, { path: input.path, kind: "page", entityId: id, status: "published" });
  return id;
}

async function upsertCategory(
  tx: Parameters<typeof upsertPage>[0],
  input: {
    title: string;
    slug: string;
    path: string;
    summary: string;
    parentId?: string | null;
    sortOrder: number;
  },
) {
  const { productCategories } = await import("../src/db/schema");
  const { reserveRoute } = await import("../src/lib/cms/routes");
  const [existing] = await tx
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.slug, input.slug))
    .limit(1);
  const id = existing?.id ?? randomUUID();
  const values = {
    title: input.title,
    slug: input.slug,
    path: input.path,
    summary: input.summary,
    body: `<p>${input.summary}</p><p>Dummy category content — replace via the CMS.</p>`,
    parentId: input.parentId ?? null,
    sortOrder: input.sortOrder,
    status: "published" as const,
    updatedAt: new Date(),
  };
  if (existing) {
    await tx.update(productCategories).set(values).where(eq(productCategories.id, id));
  } else {
    await tx.insert(productCategories).values({ id, ...values });
  }
  await reserveRoute(tx, { path: input.path, kind: "category", entityId: id, status: "published" });
  return id;
}

async function upsertProduct(
  tx: Parameters<typeof upsertPage>[0],
  input: { title: string; slug: string; path: string; summary: string; categoryId: string; sortOrder: number },
) {
  const { products } = await import("../src/db/schema");
  const { reserveRoute } = await import("../src/lib/cms/routes");
  const [existing] = await tx.select({ id: products.id }).from(products).where(eq(products.path, input.path)).limit(1);
  const id = existing?.id ?? randomUUID();
  const values = {
    title: input.title,
    slug: input.slug,
    path: input.path,
    summary: input.summary,
    body: `<p>${input.summary}</p><p>Dummy product detail — add specs and images in the admin.</p>`,
    categoryId: input.categoryId,
    sortOrder: input.sortOrder,
    status: "published" as const,
    updatedAt: new Date(),
  };
  if (existing) {
    await tx.update(products).set(values).where(eq(products.id, id));
  } else {
    await tx.insert(products).values({ id, ...values });
  }
  await reserveRoute(tx, { path: input.path, kind: "product", entityId: id, status: "published" });
  return id;
}

async function seedCategoryTree(
  tx: Parameters<typeof upsertPage>[0],
  nodes: SkeletonCategory[],
  parentId: string | null,
  featuredProductIds: string[],
) {
  let order = 0;
  for (const node of nodes) {
    const categoryId = await upsertCategory(tx, {
      title: node.title,
      slug: node.slug,
      path: node.path,
      summary: node.summary,
      parentId,
      sortOrder: order++,
    });

    if (node.children?.length) {
      await seedCategoryTree(tx, node.children, categoryId, featuredProductIds);
    }
    if (node.products?.length) {
      let productOrder = 0;
      for (const product of node.products) {
        const productPath =
          product.slug === node.slug ? `${node.path}/${product.slug}-overview` : `${node.path}/${product.slug}`;
        const productId = await upsertProduct(tx, {
          title: product.title,
          slug: `${node.slug}-${product.slug}`.slice(0, 120),
          path: productPath,
          summary: product.summary,
          categoryId,
          sortOrder: productOrder++,
        });
        featuredProductIds.push(productId);
      }
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env.local, then run: npm run db:seed-structure");
    process.exit(1);
  }

  const { closeDb, getDb } = await import("../src/db");
  const {
    certificates,
    galleryItems,
    homeContent,
    homeFeaturedProducts,
    media,
    navLinks,
    posts,
    siteSettings,
  } = await import("../src/db/schema");
  const { ensureSingletons } = await import("../src/lib/cms/queries");
  const { reserveRoute } = await import("../src/lib/cms/routes");

  await ensureSingletons();
  const db = getDb();

  const [navCount] = await db.select({ count: sql<number>`count(*)::int` }).from(navLinks);
  if ((navCount?.count ?? 0) > 0 && process.env.SEED_FORCE !== "1") {
    console.log("Navigation already exists. Set SEED_FORCE=1 to rebuild structure.");
    await closeDb();
    return;
  }

  if (process.env.SEED_FORCE === "1") {
    await db.delete(homeFeaturedProducts);
    await db.delete(navLinks);
  }

  const placeholderMediaId = randomUUID();
  await db
    .insert(media)
    .values({
      id: placeholderMediaId,
      filename: "product.svg",
      alt: "Placeholder",
      mimeType: "image/svg+xml",
      size: 512,
      storageDriver: "r2",
      storageKey: "placeholders/product.svg",
      url: PLACEHOLDER_IMAGE,
    })
    .onConflictDoNothing();

  const [mediaRow] = await db.select({ id: media.id }).from(media).where(eq(media.url, PLACEHOLDER_IMAGE)).limit(1);
  const mediaId = mediaRow?.id ?? placeholderMediaId;

  await db
    .update(homeContent)
    .set({
      heroEyebrow: homeDefaults.heroEyebrow,
      heroHeadline: homeDefaults.heroHeadline,
      heroSubcopy: homeDefaults.heroSubcopy,
      aboutTitle: homeDefaults.aboutTitle,
      aboutBody: homeDefaults.aboutBody,
      aboutPillars,
      showcaseCategoryPaths: [...homeShowcasePaths],
      whyChooseTitle: homeDefaults.whyChooseTitle,
      whyChooseIntro: homeDefaults.whyChooseIntro,
      whyChooseUs: homeDefaults.whyChooseUs,
      visionTitle: homeDefaults.visionTitle,
      visionBody: homeDefaults.visionBody,
      missionTitle: homeDefaults.missionTitle,
      missionBody: homeDefaults.missionBody,
      updatedAt: new Date(),
    })
    .where(eq(homeContent.id, "default"));

  await db
    .update(siteSettings)
    .set({
      youtubeUrl: "https://youtube.com/",
      facebookUrl: "https://facebook.com/",
      quoteCtaLabel: brand.quoteCtaLabel,
      quoteCtaHref: brand.quoteCtaHref,
      updatedAt: new Date(),
    })
    .where(eq(siteSettings.id, "default"));

  const featuredProductIds: string[] = [];

  await db.transaction(async (tx) => {
    for (const page of skeletonPages) {
      await upsertPage(tx, {
        title: page.title,
        slug: page.slug,
        path: page.path,
        body: `<p>Dummy ${page.title} page content. Edit this section in the admin under Pages.</p>`,
      });
    }

    await seedCategoryTree(tx, skeletonCatalogue, null, featuredProductIds);

    let postOrder = 0;
    for (const post of skeletonPosts) {
      const [existing] = await tx.select({ id: posts.id }).from(posts).where(eq(posts.slug, post.slug)).limit(1);
      const id = existing?.id ?? randomUUID();
      const values = {
        title: post.title,
        slug: post.slug,
        path: post.slug,
        excerpt: post.excerpt,
        body: `<p>${post.excerpt}</p><p>Full blog body placeholder.</p>`,
        publishedAt: new Date(Date.now() - postOrder * 86400000),
        status: "published" as const,
        updatedAt: new Date(),
      };
      if (existing) {
        await tx.update(posts).set(values).where(eq(posts.id, id));
      } else {
        await tx.insert(posts).values({ id, ...values });
      }
      await reserveRoute(tx, { path: post.slug, kind: "post", entityId: id, status: "published" });
      postOrder += 1;
    }

    let navOrder = 0;
    for (const item of skeletonHeaderNav) {
      const parentId = randomUUID();
      await tx.insert(navLinks).values({
        id: parentId,
        location: "header",
        label: item.label,
        href: item.href,
        sortOrder: navOrder++,
      });
      if ("children" in item && item.children) {
        let childOrder = 0;
        for (const child of item.children) {
          await tx.insert(navLinks).values({
            id: randomUUID(),
            location: "header",
            label: child.label,
            href: child.href,
            parentId,
            sortOrder: childOrder++,
          });
        }
      }
    }

    navOrder = 0;
    for (const item of skeletonFooterNav) {
      await tx.insert(navLinks).values({
        id: randomUUID(),
        location: "footer",
        label: item.label,
        href: item.href,
        sortOrder: navOrder++,
      });
    }

    for (let i = 0; i < 6; i++) {
      await tx.insert(galleryItems).values({
        title: `Gallery item ${i + 1}`,
        caption: "Placeholder factory or product photo.",
        mediaId,
        sortOrder: i,
      });
    }

    for (let i = 0; i < 4; i++) {
      await tx.insert(certificates).values({
        title: `Certificate ${i + 1}`,
        caption: "Dummy certificate thumbnail.",
        mediaId,
        sortOrder: i,
      });
    }
  });

  const pickFeatured = featuredProductIds.slice(0, 12);
  if (pickFeatured.length) {
    await db.delete(homeFeaturedProducts);
    await db.insert(homeFeaturedProducts).values(
      pickFeatured.map((productId, sortOrder) => ({
        productId,
        sortOrder,
      })),
    );
  }

  console.log("Site structure seeded (pages, catalogue, nav, posts, gallery, certificates).");
  console.log("Run npm run dev and open http://localhost:3000/");
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
