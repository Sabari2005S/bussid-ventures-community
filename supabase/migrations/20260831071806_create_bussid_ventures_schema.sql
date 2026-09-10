/*
# BUSSID Ventures Community — core schema

1. Overview
Creates the database backing the BUSSID Ventures Community gaming platform:
a livery collection (with categories), tournaments, and supporting storage
buckets for preview images and downloadable livery files.

2. New Tables
- `categories` — livery categories (Bus, Minibus, Truck, Special, Event, Custom).
  - id (uuid pk), name (text unique), slug (text unique), description, created_at.
- `liveries` — community liveries shown on the public Livery Collection page.
  - id (uuid pk), name, vehicle_name, creator, category_id (fk categories),
    description, image_path (storage path for preview image),
    file_path (storage path for downloadable zip/rar),
    file_name (original-safe display name), downloads (int default 0),
    badge (text: NEW/HOT/null), is_featured (bool), created_at, updated_at.
- `tournaments` — esports-style tournament event cards.
  - id (uuid pk), name, event_date, prize_pool (text), participants (int),
    max_participants, status (text: upcoming/live/completed),
    is_online (bool), banner_path, description, created_at.

3. Storage
- Public bucket `livery-images` for preview images (jpg/png/webp).
- Public bucket `livery-files` for downloadable livery files (zip/rar).

4. Security (RLS)
- `categories`: public read, admin write (authenticated).
- `liveries`: public read (anon+authenticated), admin write (authenticated).
- `tournaments`: public read, admin write (authenticated).
- Storage objects: public read on both buckets; only authenticated can upload/update/delete.

5. Notes
- Single admin model: any authenticated Supabase user can manage content.
  Public visitors (anon key) can browse and download but cannot modify.
- Download counting uses a SECURITY DEFINER RPC `increment_livery_downloads`
  so the count is updated server-side atomically and returns the public file URL.
*/

-- ---------- categories ----------
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE
  TO authenticated USING (true);

-- ---------- liveries ----------
CREATE TABLE IF NOT EXISTS liveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vehicle_name text NOT NULL,
  creator text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  description text,
  image_path text,
  file_path text,
  file_name text,
  downloads integer NOT NULL DEFAULT 0,
  badge text,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE liveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_liveries" ON liveries;
CREATE POLICY "public_read_liveries" ON liveries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_liveries" ON liveries;
CREATE POLICY "admin_insert_liveries" ON liveries FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_liveries" ON liveries;
CREATE POLICY "admin_update_liveries" ON liveries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_liveries" ON liveries;
CREATE POLICY "admin_delete_liveries" ON liveries FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS liveries_category_id_idx ON liveries(category_id);
CREATE INDEX IF NOT EXISTS liveries_created_at_idx ON liveries(created_at DESC);
CREATE INDEX IF NOT EXISTS liveries_downloads_idx ON liveries(downloads DESC);

-- ---------- tournaments ----------
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_date date NOT NULL,
  prize_pool text NOT NULL DEFAULT '0',
  participants integer NOT NULL DEFAULT 0,
  max_participants integer NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'upcoming',
  is_online boolean NOT NULL DEFAULT true,
  banner_path text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_tournaments" ON tournaments;
CREATE POLICY "public_read_tournaments" ON tournaments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_tournaments" ON tournaments;
CREATE POLICY "admin_insert_tournaments" ON tournaments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_tournaments" ON tournaments;
CREATE POLICY "admin_update_tournaments" ON tournaments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_tournaments" ON tournaments;
CREATE POLICY "admin_delete_tournaments" ON tournaments FOR DELETE
  TO authenticated USING (true);

-- ---------- updated_at trigger for liveries ----------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS liveries_set_updated_at ON liveries;
CREATE TRIGGER liveries_set_updated_at
BEFORE UPDATE ON liveries
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------- download increment RPC ----------
CREATE OR REPLACE FUNCTION increment_livery_downloads(p_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_file_path text;
BEGIN
  UPDATE liveries SET downloads = downloads + 1 WHERE id = p_id
    RETURNING file_path INTO v_file_path;
  RETURN v_file_path;
END;
$$;

-- ---------- storage buckets ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('livery-images', 'livery-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('livery-files', 'livery-files', true)
ON CONFLICT (id) DO NOTHING;

-- storage policies: public read, authenticated write
DROP POLICY IF EXISTS "public_read_livery_images" ON storage.objects;
CREATE POLICY "public_read_livery_images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'livery-images');

DROP POLICY IF EXISTS "admin_write_livery_images" ON storage.objects;
CREATE POLICY "admin_write_livery_images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'livery-images');

DROP POLICY IF EXISTS "admin_update_livery_images" ON storage.objects;
CREATE POLICY "admin_update_livery_images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'livery-images');

DROP POLICY IF EXISTS "admin_delete_livery_images" ON storage.objects;
CREATE POLICY "admin_delete_livery_images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'livery-images');

DROP POLICY IF EXISTS "public_read_livery_files" ON storage.objects;
CREATE POLICY "public_read_livery_files" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'livery-files');

DROP POLICY IF EXISTS "admin_write_livery_files" ON storage.objects;
CREATE POLICY "admin_write_livery_files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'livery-files');

DROP POLICY IF EXISTS "admin_update_livery_files" ON storage.objects;
CREATE POLICY "admin_update_livery_files" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'livery-files');

DROP POLICY IF EXISTS "admin_delete_livery_files" ON storage.objects;
CREATE POLICY "admin_delete_livery_files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'livery-files');

-- ---------- seed categories ----------
INSERT INTO categories (name, slug, description) VALUES
  ('Bus', 'bus', 'Full-size bus liveries'),
  ('Minibus', 'minibus', 'Minibus and van liveries'),
  ('Truck', 'truck', 'Truck and cargo vehicle liveries'),
  ('Special', 'special', 'Limited edition and special liveries'),
  ('Event', 'event', 'Tournament and event exclusive liveries'),
  ('Custom', 'custom', 'Community custom creations')
ON CONFLICT (slug) DO NOTHING;

-- ---------- seed tournaments ----------
INSERT INTO tournaments (name, event_date, prize_pool, participants, max_participants, status, is_online, description) VALUES
  ('BUSSID Grand Prix Season 5', '2026-09-20', 'Rp 5.000.000', 64, 128, 'upcoming', true, 'The biggest BUSSID racing championship of the season. 128 slots, single elimination, live-streamed finals.'),
  ('City Lines Showdown', '2026-10-05', 'Rp 2.500.000', 32, 64, 'upcoming', true, 'A route-based precision driving tournament. Best lap times across 5 city routes advance.'),
  ('Livery Design World Cup', '2026-10-18', 'Rp 3.000.000', 48, 96, 'upcoming', true, 'Submit your best custom livery. Community voting plus judge panel decide the champion designer.'),
  ('Highway Heroes Marathon', '2026-11-02', 'Rp 1.500.000', 24, 50, 'upcoming', false, 'Offline event in Jakarta. Long-haul endurance challenge across the highway network.')
ON CONFLICT DO NOTHING;
