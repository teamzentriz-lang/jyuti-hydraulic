CREATE TYPE "public"."content_entity_kind" AS ENUM('page', 'product', 'category', 'post');--> statement-breakpoint
CREATE TYPE "public"."form_field_type" AS ENUM('text', 'email', 'phone', 'number', 'textarea', 'select', 'multi_select', 'radio', 'checkbox', 'file', 'date', 'product_select', 'category_select');--> statement-breakpoint
CREATE TYPE "public"."nav_item_type" AS ENUM('page', 'product_category', 'product', 'blog', 'blog_category', 'gallery', 'certificate', 'catalogue', 'custom_url');--> statement-breakpoint
CREATE TYPE "public"."page_type" AS ENUM('home', 'about', 'contact', 'custom', 'landing_page', 'product_listing', 'blog_listing', 'gallery', 'certificates', 'catalogue');--> statement-breakpoint
CREATE TYPE "public"."product_document_type" AS ENUM('datasheet', 'brochure', 'catalogue', 'manual', 'technical_drawing', 'certificate', 'other');--> statement-breakpoint
CREATE TYPE "public"."product_relation_type" AS ENUM('related', 'alternative', 'accessory', 'compatible', 'upsell');--> statement-breakpoint
CREATE TYPE "public"."section_type" AS ENUM('hero', 'text', 'rich_text', 'image', 'image_text', 'text_image', 'features', 'feature_grid', 'icon_grid', 'stats', 'product_grid', 'product_carousel', 'category_grid', 'blog_grid', 'blog_carousel', 'gallery', 'certificates', 'catalogue', 'cta', 'contact', 'contact_form', 'map', 'faq', 'video', 'logo_grid', 'testimonials', 'about', 'product_list', 'product_category_list', 'why_choose_us', 'vision', 'mission', 'custom');--> statement-breakpoint
ALTER TYPE "public"."inquiry_status" ADD VALUE 'contacted';--> statement-breakpoint
ALTER TYPE "public"."inquiry_status" ADD VALUE 'in_progress';--> statement-breakpoint
ALTER TYPE "public"."inquiry_status" ADD VALUE 'converted';--> statement-breakpoint
ALTER TYPE "public"."inquiry_status" ADD VALUE 'closed';--> statement-breakpoint
ALTER TYPE "public"."inquiry_status" ADD VALUE 'spam';--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_id" uuid,
	"meta_title" text,
	"meta_description" text,
	"canonical_url" text,
	"og_image_id" uuid,
	"robots_index" boolean DEFAULT true NOT NULL,
	"robots_follow" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"legacy_id" integer,
	"legacy_slug" text,
	"legacy_url" text,
	"legacy_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"legacy_id" integer,
	"legacy_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_image_id" uuid,
	"document_id" uuid,
	"version" text DEFAULT '' NOT NULL,
	"published_date" timestamp with time zone,
	"expiry_date" timestamp with time zone,
	"language" text DEFAULT '' NOT NULL,
	"file_size" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"canonical_url" text,
	"legacy_id" integer,
	"legacy_slug" text,
	"legacy_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_related_categories" (
	"category_id" uuid NOT NULL,
	"related_category_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "category_related_categories_category_id_related_category_id_pk" PRIMARY KEY("category_id","related_category_id"),
	CONSTRAINT "category_related_not_self" CHECK ("category_related_categories"."category_id" <> "category_related_categories"."related_category_id")
);
--> statement-breakpoint
CREATE TABLE "cms_form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"label" text NOT NULL,
	"name" text NOT NULL,
	"field_type" "form_field_type" DEFAULT 'text' NOT NULL,
	"placeholder" text DEFAULT '' NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"options_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"validation_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"submit_label" text DEFAULT 'Submit' NOT NULL,
	"success_message" text DEFAULT '' NOT NULL,
	"notification_email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"whatsapp" text DEFAULT '' NOT NULL,
	"map_url" text,
	"map_embed" text,
	"latitude" text,
	"longitude" text,
	"business_hours" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_settings_singleton" CHECK ("contact_settings"."id" = 'default')
);
--> statement-breakpoint
CREATE TABLE "content_faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_kind" "content_entity_kind" NOT NULL,
	"entity_id" uuid NOT NULL,
	"question" text DEFAULT '' NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_kind" "content_entity_kind" NOT NULL,
	"entity_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"headers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"responsive_mode" text DEFAULT 'scroll' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "footer_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"logo_id" uuid,
	"description" text DEFAULT '' NOT NULL,
	"quick_links_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"product_links_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contact_information_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"social_links_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"newsletter_enabled" boolean DEFAULT false NOT NULL,
	"newsletter_title" text DEFAULT '' NOT NULL,
	"newsletter_description" text DEFAULT '' NOT NULL,
	"copyright_text" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "footer_settings_singleton" CHECK ("footer_settings"."id" = 'default')
);
--> statement-breakpoint
CREATE TABLE "gallery_albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_image_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"legacy_id" integer,
	"legacy_slug" text,
	"legacy_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "header_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"logo_id" uuid,
	"mobile_logo_id" uuid,
	"favicon_id" uuid,
	"top_bar_enabled" boolean DEFAULT true NOT NULL,
	"top_bar_text" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"cta_text" text DEFAULT '' NOT NULL,
	"cta_url" text DEFAULT '' NOT NULL,
	"sticky_header" boolean DEFAULT true NOT NULL,
	"mobile_menu_json" jsonb DEFAULT 'null'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "header_settings_singleton" CHECK ("header_settings"."id" = 'default')
);
--> statement-breakpoint
CREATE TABLE "page_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid,
	"product_id" uuid,
	"category_id" uuid,
	"section_type" "section_type" DEFAULT 'custom' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"eyebrow" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_id" uuid,
	"background_image_id" uuid,
	"mobile_image_id" uuid,
	"button_text" text DEFAULT '' NOT NULL,
	"button_url" text DEFAULT '' NOT NULL,
	"secondary_button_text" text DEFAULT '' NOT NULL,
	"secondary_button_url" text DEFAULT '' NOT NULL,
	"alignment" text DEFAULT '' NOT NULL,
	"layout" text DEFAULT '' NOT NULL,
	"background" text DEFAULT '' NOT NULL,
	"custom_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "product_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_media_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"media_id" uuid,
	"document_type" "product_document_type" DEFAULT 'other' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"version" text DEFAULT '' NOT NULL,
	"document_date" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon_media_id" uuid,
	"image_media_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"option_name" text DEFAULT '' NOT NULL,
	"option_value" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_media_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_specifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"group" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_technical_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"table_title" text DEFAULT '' NOT NULL,
	"columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stat_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid,
	"number" text DEFAULT '' NOT NULL,
	"suffix" text DEFAULT '' NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"company" text DEFAULT '' NOT NULL,
	"designation" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"image_id" uuid,
	"rating" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "company_name" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "phone_primary" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "email_primary" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "email_secondary" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "enquiry_to_email" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "address" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "whatsapp" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "footer_text" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "quote_cta_label" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "certificate_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "issuing_authority" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "certificate_type" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "issue_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "expiry_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "document_id" uuid;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "status" text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "legacy_id" integer;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "legacy_url" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "company" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "subject" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "source_page" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "admin_notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "original_name" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "caption" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "folder" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "uploaded_by_id" uuid;--> statement-breakpoint
ALTER TABLE "nav_links" ADD COLUMN "item_slug" text;--> statement-breakpoint
ALTER TABLE "nav_links" ADD COLUMN "item_type" text DEFAULT 'custom_url' NOT NULL;--> statement-breakpoint
ALTER TABLE "nav_links" ADD COLUMN "reference_id" uuid;--> statement-breakpoint
ALTER TABLE "nav_links" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "nav_links" ADD COLUMN "legacy_id" integer;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "page_type" text DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "featured_image_id" uuid;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "excerpt" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "short_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "custom_content" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "breadcrumbs_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "focus_keyword" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "robots_index" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "robots_follow" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "og_title" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "og_description" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "og_image_id" uuid;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "twitter_title" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "twitter_description" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "twitter_image_id" uuid;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "schema_type" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "legacy_slug" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "legacy_type" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "author" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "reading_time" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "allow_comments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "breadcrumbs_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "focus_keyword" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "og_title" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "og_description" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "og_image_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "twitter_image_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "robots_index" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "robots_follow" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "legacy_slug" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "legacy_type" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "banner_image_id" uuid;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "thumbnail_id" uuid;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "icon_id" uuid;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "show_in_menu" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "show_on_homepage" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "listing_config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "breadcrumbs_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "focus_keyword" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "og_image_id" uuid;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "robots_index" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "robots_follow" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "legacy_slug" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "legacy_type" text;--> statement-breakpoint
ALTER TABLE "product_relations" ADD COLUMN "relation_type" text DEFAULT 'related' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sub_category_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_code" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "model_number" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "rich_content" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "overview" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "features_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "benefits" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "advantages" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "applications_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "working_principle" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "construction" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "material" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "manufacturing_details" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "quality_information" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "maintenance_information" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "safety_information" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "customization_information" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "featured_image_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "thumbnail_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "diagram_image_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "technical_drawing_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "dimension_drawing_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "installation_image_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "enquiry_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "enquiry_button_text" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "enquiry_form_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "enquiry_email" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "breadcrumbs_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "focus_keyword" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "og_title" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "og_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "og_image_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "twitter_title" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "twitter_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "twitter_image_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "robots_index" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "robots_follow" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "legacy_slug" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "legacy_type" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "site_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "favicon_id" uuid;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "tagline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "short_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "long_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "address_line1" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "address_line2" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "city" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "state" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "country" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "pincode" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "twitter_url" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "footer_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "copyright_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "map_embed_url" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "latitude" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "longitude" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "established_year" integer;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "business_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "shipping_information" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "service_area" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "enquiry_button_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "blog_categories" ADD CONSTRAINT "blog_categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_categories" ADD CONSTRAINT "blog_categories_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogues" ADD CONSTRAINT "catalogues_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogues" ADD CONSTRAINT "catalogues_document_id_media_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_related_categories" ADD CONSTRAINT "category_related_categories_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_related_categories" ADD CONSTRAINT "category_related_categories_related_category_id_product_categories_id_fk" FOREIGN KEY ("related_category_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_form_fields" ADD CONSTRAINT "cms_form_fields_form_id_cms_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."cms_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "footer_settings" ADD CONSTRAINT "footer_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_albums" ADD CONSTRAINT "gallery_albums_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_album_id_gallery_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."gallery_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "header_settings" ADD CONSTRAINT "header_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "header_settings" ADD CONSTRAINT "header_settings_mobile_logo_id_media_id_fk" FOREIGN KEY ("mobile_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "header_settings" ADD CONSTRAINT "header_settings_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_background_image_id_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_blog_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_applications" ADD CONSTRAINT "product_applications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_applications" ADD CONSTRAINT "product_applications_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_features" ADD CONSTRAINT "product_features_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_features" ADD CONSTRAINT "product_features_icon_media_id_media_id_fk" FOREIGN KEY ("icon_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_features" ADD CONSTRAINT "product_features_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_technical_tables" ADD CONSTRAINT "product_technical_tables_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stat_counters" ADD CONSTRAINT "stat_counters_section_id_page_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."page_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_categories_slug_unique" ON "blog_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_tags_slug_unique" ON "blog_tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "catalogues_slug_unique" ON "catalogues" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cms_form_fields_form_idx" ON "cms_form_fields" USING btree ("form_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_forms_slug_unique" ON "cms_forms" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_faqs_entity_idx" ON "content_faqs" USING btree ("entity_kind","entity_id","sort_order");--> statement-breakpoint
CREATE INDEX "content_tables_entity_idx" ON "content_tables" USING btree ("entity_kind","entity_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "gallery_albums_slug_unique" ON "gallery_albums" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "gallery_images_album_idx" ON "gallery_images" USING btree ("album_id","sort_order");--> statement-breakpoint
CREATE INDEX "page_sections_page_idx" ON "page_sections" USING btree ("page_id","sort_order");--> statement-breakpoint
CREATE INDEX "page_sections_product_idx" ON "page_sections" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "page_sections_category_idx" ON "page_sections" USING btree ("category_id","sort_order");--> statement-breakpoint
CREATE INDEX "product_applications_product_idx" ON "product_applications" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "product_documents_product_idx" ON "product_documents" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "product_features_product_idx" ON "product_features" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "product_options_product_idx" ON "product_options" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "product_specifications_product_idx" ON "product_specifications" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "product_technical_tables_product_idx" ON "product_technical_tables" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "stat_counters_section_idx" ON "stat_counters" USING btree ("section_id","sort_order");--> statement-breakpoint
CREATE INDEX "testimonials_order_idx" ON "testimonials" USING btree ("sort_order");--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_document_id_media_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_twitter_image_id_media_id_fk" FOREIGN KEY ("twitter_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_twitter_image_id_media_id_fk" FOREIGN KEY ("twitter_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_banner_image_id_media_id_fk" FOREIGN KEY ("banner_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_sub_category_id_product_categories_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_diagram_image_id_media_id_fk" FOREIGN KEY ("diagram_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_technical_drawing_id_media_id_fk" FOREIGN KEY ("technical_drawing_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_dimension_drawing_id_media_id_fk" FOREIGN KEY ("dimension_drawing_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_installation_image_id_media_id_fk" FOREIGN KEY ("installation_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_twitter_image_id_media_id_fk" FOREIGN KEY ("twitter_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_folder_idx" ON "media" USING btree ("folder");