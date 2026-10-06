CREATE TYPE "public"."inquiry_source" AS ENUM('contact', 'quote', 'product');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'read', 'archived');--> statement-breakpoint
CREATE TYPE "public"."nav_location" AS ENUM('header', 'footer', 'products');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."storage_driver" AS ENUM('local', 'r2');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"country" text NOT NULL,
	"product_line" text DEFAULT '' NOT NULL,
	"category_id" uuid,
	"product_id" uuid,
	"body" text DEFAULT '' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"legacy_id" integer,
	"legacy_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_content" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"hero_headline" text DEFAULT '' NOT NULL,
	"hero_subcopy" text DEFAULT '' NOT NULL,
	"about_title" text DEFAULT 'Welcome to Jyoti Hydraulic' NOT NULL,
	"about_body" text DEFAULT '' NOT NULL,
	"about_media_id" uuid,
	"why_choose_us" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vision_title" text DEFAULT 'Vision' NOT NULL,
	"vision_body" text DEFAULT '' NOT NULL,
	"mission_title" text DEFAULT 'Mission' NOT NULL,
	"mission_body" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "home_content_singleton" CHECK ("home_content"."id" = 'default')
);
--> statement-breakpoint
CREATE TABLE "home_featured_products" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_hero_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"source" "inquiry_source" DEFAULT 'contact' NOT NULL,
	"product_id" uuid,
	"page_path" text,
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"location_name" text NOT NULL,
	"region" text DEFAULT '' NOT NULL,
	"category_id" uuid,
	"product_id" uuid,
	"body" text DEFAULT '' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"legacy_id" integer,
	"legacy_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"storage_driver" "storage_driver" DEFAULT 'local' NOT NULL,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"legacy_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "media_legacy_url_unique" UNIQUE("legacy_url")
);
--> statement-breakpoint
CREATE TABLE "nav_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location" "nav_location" NOT NULL,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"open_in_new_tab" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"hero_media_id" uuid,
	"body" text DEFAULT '' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"legacy_id" integer,
	"legacy_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"published_at" timestamp with time zone,
	"cover_media_id" uuid,
	"excerpt" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"legacy_id" integer,
	"legacy_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"parent_id" uuid,
	"summary" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"image_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"legacy_id" integer,
	"legacy_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_relations" (
	"product_id" uuid NOT NULL,
	"related_product_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_relations_product_id_related_product_id_pk" PRIMARY KEY("product_id","related_product_id"),
	CONSTRAINT "product_relations_not_self" CHECK ("product_relations"."product_id" <> "product_relations"."related_product_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"category_id" uuid,
	"summary" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"specs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brochure_media_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"legacy_id" integer,
	"legacy_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_status_code" CHECK ("redirects"."status_code" in (301, 302))
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"path" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"company_name" text DEFAULT 'Jyoti Hydraulic' NOT NULL,
	"logo_id" uuid,
	"phone_primary" text DEFAULT '+91 9541424317' NOT NULL,
	"phone_secondary" text,
	"email_primary" text DEFAULT 'info@jyotihydraulic.com' NOT NULL,
	"email_secondary" text DEFAULT 'jyotihydraulic@gmail.com',
	"enquiry_to_email" text DEFAULT 'info@jyotihydraulic.com' NOT NULL,
	"address" text DEFAULT 'Plot No. 01 & 02, Sector-57, Faridabad-121004, Haryana, India' NOT NULL,
	"whatsapp" text DEFAULT '919541424317',
	"youtube_url" text,
	"facebook_url" text,
	"instagram_url" text,
	"linkedin_url" text,
	"catalogue_id" uuid,
	"footer_text" text DEFAULT 'Established in 2014, Faridabad, India. Leading manufacturer of hydraulic equipment, jigs, and fixtures.' NOT NULL,
	"map_url" text,
	"gtranslate_enabled" boolean DEFAULT false NOT NULL,
	"quote_cta_label" text DEFAULT 'Get a free quote' NOT NULL,
	"quote_cta_href" text DEFAULT '/contact/' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 'default')
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_pages" ADD CONSTRAINT "export_pages_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_pages" ADD CONSTRAINT "export_pages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_content" ADD CONSTRAINT "home_content_about_media_id_media_id_fk" FOREIGN KEY ("about_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_featured_products" ADD CONSTRAINT "home_featured_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_hero_images" ADD CONSTRAINT "home_hero_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_pages" ADD CONSTRAINT "location_pages_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_pages" ADD CONSTRAINT "location_pages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nav_links" ADD CONSTRAINT "nav_links_parent_id_nav_links_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."nav_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brochure_media_id_media_id_fk" FOREIGN KEY ("brochure_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_catalogue_id_media_id_fk" FOREIGN KEY ("catalogue_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certificates_order_idx" ON "certificates" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "export_pages_slug_unique" ON "export_pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "export_pages_path_unique" ON "export_pages" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "export_pages_legacy_id_unique" ON "export_pages" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "export_pages_country_idx" ON "export_pages" USING btree ("country");--> statement-breakpoint
CREATE INDEX "gallery_items_order_idx" ON "gallery_items" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "home_featured_products_order_idx" ON "home_featured_products" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "home_hero_images_order_idx" ON "home_hero_images" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "inquiries_status_idx" ON "inquiries" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "location_pages_slug_unique" ON "location_pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "location_pages_path_unique" ON "location_pages" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "location_pages_legacy_id_unique" ON "location_pages" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "location_pages_region_idx" ON "location_pages" USING btree ("region");--> statement-breakpoint
CREATE INDEX "media_filename_idx" ON "media" USING btree ("filename");--> statement-breakpoint
CREATE INDEX "nav_links_location_idx" ON "nav_links" USING btree ("location","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_unique" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_path_unique" ON "pages" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_legacy_id_unique" ON "pages" USING btree ("legacy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_unique" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_path_unique" ON "posts" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_legacy_id_unique" ON "posts" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "posts_published_idx" ON "posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_path_unique" ON "product_categories" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_legacy_id_unique" ON "product_categories" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "product_categories_parent_idx" ON "product_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_unique" ON "product_images" USING btree ("product_id","media_id");--> statement-breakpoint
CREATE INDEX "product_images_order_idx" ON "product_images" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "products_path_unique" ON "products" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "products_legacy_id_unique" ON "products" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "redirects_from_path_unique" ON "redirects" USING btree ("from_path");--> statement-breakpoint
CREATE INDEX "routes_entity_idx" ON "routes" USING btree ("entity_id","kind");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");