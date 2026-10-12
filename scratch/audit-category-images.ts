import { config } from "dotenv";
import { eq, or } from "drizzle-orm";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const { closeDb, getDb } = await import("../src/db");
  const { productCategories, productImages, products } = await import(
    "../src/db/schema"
  );
  const db = getDb();
  const [root] = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.path, "products/hydraulic-cylinders"))
    .limit(1);
  if (!root) throw new Error("Category not found");
  const children = await db
    .select({
      id: productCategories.id,
      title: productCategories.title,
      imageId: productCategories.imageId,
      thumbnailId: productCategories.thumbnailId,
    })
    .from(productCategories)
    .where(eq(productCategories.parentId, root.id));
  const rootProducts = await db
    .select({
      id: products.id,
      title: products.title,
      featuredImageId: products.featuredImageId,
      thumbnailId: products.thumbnailId,
    })
    .from(products)
    .where(eq(products.categoryId, root.id));
  console.log({ rootProducts: rootProducts.length });
  for (const product of rootProducts) {
    const galleries = await db
      .select({ productId: productImages.productId })
      .from(productImages)
      .where(eq(productImages.productId, product.id));
    console.log({
      title: product.title,
      directImage: Boolean(product.thumbnailId || product.featuredImageId),
      galleryImages: galleries.length,
    });
  }
  for (const child of children) {
    const productRows = await db
      .select({
        id: products.id,
        featuredImageId: products.featuredImageId,
        thumbnailId: products.thumbnailId,
      })
      .from(products)
      .where(
        or(
          eq(products.categoryId, child.id),
          eq(products.subCategoryId, child.id),
        ),
      );
    const galleryRows = productRows.length
      ? await db
          .select({ productId: productImages.productId })
          .from(productImages)
          .where(eq(productImages.productId, productRows[0]!.id))
      : [];
    console.log({
      title: child.title,
      categoryImage: Boolean(child.thumbnailId || child.imageId),
      products: productRows.length,
      directProductImages: productRows.filter(
        (item) => item.thumbnailId || item.featuredImageId,
      ).length,
      firstProductGallery: galleryRows.length,
    });
  }
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
