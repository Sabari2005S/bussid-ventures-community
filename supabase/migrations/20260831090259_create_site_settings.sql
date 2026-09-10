/*
# Site settings table

1. New Tables
- `site_settings` — single-row table for site-wide customization.
  - id (int, always 1), hero_image_path (storage path for custom hero background),
    hero_image_url (cached public URL), updated_at.

2. Security
- Public read (anon + authenticated) so the homepage can load the image.
- Admin write (authenticated) only.

3. Notes
- Only one row exists (id = 1), seeded on creation.
- The hero background on the homepage will use this image if set,
  otherwise falls back to the default slideshow.
*/

CREATE TABLE IF NOT EXISTS site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  hero_image_path text,
  hero_image_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_site_settings" ON site_settings;
CREATE POLICY "public_read_site_settings" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_site_settings" ON site_settings;
CREATE POLICY "admin_update_site_settings" ON site_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_insert_site_settings" ON site_settings;
CREATE POLICY "admin_insert_site_settings" ON site_settings FOR INSERT
  TO authenticated WITH CHECK (true);

-- Seed the single row
INSERT INTO site_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for site assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_site_assets" ON storage.objects;
CREATE POLICY "public_read_site_assets" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "admin_write_site_assets" ON storage.objects;
CREATE POLICY "admin_write_site_assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "admin_delete_site_assets" ON storage.objects;
CREATE POLICY "admin_delete_site_assets" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'site-assets');
