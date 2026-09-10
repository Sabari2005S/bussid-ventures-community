/*
# Social links, QR codes, and About hero image

1. New Tables
- `social_links` — stores the name, URL, QR code image path, and display info for each social media group/channel.
  - id (uuid), platform (text: whatsapp/telegram/discord/youtube/instagram/etc), label (text), url (text),
    qr_image_path (text, nullable), sort_order (int), is_active (boolean), created_at, updated_at.
- `about_settings` — single-row table for the About page hero image.
  - id (int, always 1), hero_image_path (text, nullable), hero_image_url (text, nullable), updated_at.

2. Security
- `social_links`: public read (anon + authenticated), admin write (authenticated).
- `about_settings`: public read, admin write.

3. Notes
- The admin can add/edit/delete social links and upload QR code images from the Settings page.
- The admin can upload a custom hero image for the About page.
- Default rows are inserted for WhatsApp, Telegram, Discord, YouTube, and Instagram.
*/

-- Social links table
CREATE TABLE IF NOT EXISTS social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  label text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  qr_image_path text,
  qr_image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_social_links" ON social_links;
CREATE POLICY "public_read_social_links" ON social_links FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_social_links" ON social_links;
CREATE POLICY "admin_insert_social_links" ON social_links FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_social_links" ON social_links;
CREATE POLICY "admin_update_social_links" ON social_links FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_social_links" ON social_links;
CREATE POLICY "admin_delete_social_links" ON social_links FOR DELETE
  TO authenticated USING (true);

-- About settings table (single row)
CREATE TABLE IF NOT EXISTS about_settings (
  id int PRIMARY KEY DEFAULT 1,
  hero_image_path text,
  hero_image_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE about_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_about_settings" ON about_settings;
CREATE POLICY "public_read_about_settings" ON about_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_about_settings" ON about_settings;
CREATE POLICY "admin_update_about_settings" ON about_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_insert_about_settings" ON about_settings;
CREATE POLICY "admin_insert_about_settings" ON about_settings FOR INSERT
  TO authenticated WITH CHECK (true);

-- Insert default about_settings row
INSERT INTO about_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Insert default social links
INSERT INTO social_links (platform, label, url, sort_order) VALUES
  ('whatsapp', 'WhatsApp', '', 0),
  ('telegram', 'Telegram', '', 1),
  ('discord', 'Discord', '', 2),
  ('youtube', 'YouTube', '', 3),
  ('instagram', 'Instagram', '', 4)
ON CONFLICT DO NOTHING;
