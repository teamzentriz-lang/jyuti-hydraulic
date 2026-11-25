ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS twitter_title text,
  ADD COLUMN IF NOT EXISTS twitter_description text,
  ADD COLUMN IF NOT EXISTS twitter_image_id uuid REFERENCES media(id) ON DELETE RESTRICT;
