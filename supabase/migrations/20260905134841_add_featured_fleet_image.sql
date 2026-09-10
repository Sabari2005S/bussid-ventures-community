/*
# Add featured fleet image to site_settings

1. Modified Tables
- `site_settings` — add `featured_fleet_image_path` (text, nullable) and `featured_fleet_image_url` (text, nullable)
  columns to store the admin-uploaded image for the homepage "Featured Fleet / Premium Liveries" section.

2. Security
- No new tables. Existing policies on site_settings already allow public read and admin write.

3. Notes
- If the columns are null, the homepage falls back to the default Pexels image.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS featured_fleet_image_path text,
  ADD COLUMN IF NOT EXISTS featured_fleet_image_url text;
