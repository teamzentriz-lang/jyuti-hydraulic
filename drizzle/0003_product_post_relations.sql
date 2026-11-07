CREATE TABLE IF NOT EXISTS "product_post_relations" (
	"product_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_post_relations_product_id_post_id_pk" PRIMARY KEY("product_id","post_id")
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_post_relations_product_id_products_id_fk') THEN
    ALTER TABLE "product_post_relations" ADD CONSTRAINT "product_post_relations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_post_relations_post_id_posts_id_fk') THEN
    ALTER TABLE "product_post_relations" ADD CONSTRAINT "product_post_relations_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_post_relations_order_idx" ON "product_post_relations" USING btree ("product_id","sort_order");
