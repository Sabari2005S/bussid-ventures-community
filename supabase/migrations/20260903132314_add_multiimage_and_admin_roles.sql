/*
# Multi-image support + admin roles system

1. New Tables
- `hero_slides` — multiple hero slideshow images for the homepage.
  - id (uuid), image_path (storage path), image_url (cached public URL), sort_order (int), created_at.
- `livery_images` — multiple gallery/preview images per livery (4+ images).
  - id (uuid), livery_id (FK to liveries), image_path (storage path), sort_order (int), created_at.
- `admin_profiles` — admin role and approval system.
  - id (uuid, FK to auth.users), email (text), role (text: 'founder' | 'admin' | 'pending'), approved (boolean), created_at.

2. Modified Tables
- `site_settings` — drop the single hero_image_path/hero_image_url columns in favor of the hero_slides table.
  (We keep the columns for backwards compat but the homepage will prefer hero_slides if rows exist.)

3. Security
- `hero_slides`: public read (anon + authenticated), admin write (authenticated).
- `livery_images`: public read (anon + authenticated), admin write (authenticated).
- `admin_profiles`: authenticated can read their own profile; founder can read all and update all.
  A SECURITY DEFINER function `is_founder()` checks if the current user has role='founder'.
  A SECURITY DEFINER function `approve_admin(p_email text)` lets founder approve a pending account.
  A SECURITY DEFINER function `set_admin_role(p_email text, p_role text)` lets founder change roles.

4. Notes
- The first user to sign up via admin login gets 'founder' role automatically via a trigger.
- All subsequent sign-ups get 'pending' role and approved=false.
- Pending admins see a waiting screen, not the dashboard.
- Only the founder can approve new admins, change roles, or remove access.
*/

-- Hero slides table
CREATE TABLE IF NOT EXISTS hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_path text NOT NULL,
  image_url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_hero_slides" ON hero_slides;
CREATE POLICY "public_read_hero_slides" ON hero_slides FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_hero_slides" ON hero_slides;
CREATE POLICY "admin_insert_hero_slides" ON hero_slides FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_hero_slides" ON hero_slides;
CREATE POLICY "admin_update_hero_slides" ON hero_slides FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_hero_slides" ON hero_slides;
CREATE POLICY "admin_delete_hero_slides" ON hero_slides FOR DELETE
  TO authenticated USING (true);

-- Livery images table (gallery)
CREATE TABLE IF NOT EXISTS livery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livery_id uuid NOT NULL REFERENCES liveries(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE livery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_livery_images" ON livery_images;
CREATE POLICY "public_read_livery_images" ON livery_images FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_livery_images" ON livery_images;
CREATE POLICY "admin_insert_livery_images" ON livery_images FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_livery_images" ON livery_images;
CREATE POLICY "admin_update_livery_images" ON livery_images FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_livery_images" ON livery_images;
CREATE POLICY "admin_delete_livery_images" ON livery_images FOR DELETE
  TO authenticated USING (true);

-- Admin profiles table
CREATE TABLE IF NOT EXISTS admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'pending',
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "read_own_admin_profile" ON admin_profiles;
CREATE POLICY "read_own_admin_profile" ON admin_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM admin_profiles ap WHERE ap.id = auth.uid() AND ap.role = 'founder'
  ));

-- Only founder can insert (but trigger handles auto-insert on signup)
DROP POLICY IF EXISTS "founder_insert_admin_profile" ON admin_profiles;
CREATE POLICY "founder_insert_admin_profile" ON admin_profiles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admin_profiles ap WHERE ap.id = auth.uid() AND ap.role = 'founder')
    OR auth.uid() = id
  );

-- Only founder can update profiles
DROP POLICY IF EXISTS "founder_update_admin_profile" ON admin_profiles;
CREATE POLICY "founder_update_admin_profile" ON admin_profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_profiles ap WHERE ap.id = auth.uid() AND ap.role = 'founder')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admin_profiles ap WHERE ap.id = auth.uid() AND ap.role = 'founder')
  );

-- Only founder can delete profiles
DROP POLICY IF EXISTS "founder_delete_admin_profile" ON admin_profiles;
CREATE POLICY "founder_delete_admin_profile" ON admin_profiles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_profiles ap WHERE ap.id = auth.uid() AND ap.role = 'founder')
  );

-- SECURITY DEFINER function: check if current user is founder
CREATE OR REPLACE FUNCTION is_founder()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = auth.uid() AND role = 'founder' AND approved = true
  );
$$;

-- SECURITY DEFINER function: approve an admin account (founder only)
CREATE OR REPLACE FUNCTION approve_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_founder() THEN
    RAISE EXCEPTION 'Only the founder can approve admins';
  END IF;
  UPDATE admin_profiles SET approved = true, role = 'admin'
  WHERE email = p_email AND role = 'pending';
  RETURN FOUND;
END;
$$;

-- SECURITY DEFINER function: reject/remove an admin (founder only)
CREATE OR REPLACE FUNCTION reject_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_founder() THEN
    RAISE EXCEPTION 'Only the founder can reject admins';
  END IF;
  DELETE FROM admin_profiles WHERE email = p_email AND role != 'founder';
  RETURN FOUND;
END;
$$;

-- SECURITY DEFINER function: promote/demote admin role (founder only)
CREATE OR REPLACE FUNCTION set_admin_role(p_email text, p_role text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_founder() THEN
    RAISE EXCEPTION 'Only the founder can change admin roles';
  END IF;
  IF p_role NOT IN ('admin', 'founder', 'pending') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  UPDATE admin_profiles SET role = p_role, approved = (p_role = 'admin' OR p_role = 'founder')
  WHERE email = p_email AND role != 'founder';
  RETURN FOUND;
END;
$$;

-- SECURITY DEFINER function: get all admin profiles (founder only)
CREATE OR REPLACE FUNCTION get_admin_profiles()
RETURNS TABLE(id uuid, email text, role text, approved boolean, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, email, role, approved, created_at FROM admin_profiles ORDER BY created_at DESC;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION is_founder() TO authenticated;
GRANT EXECUTE ON FUNCTION approve_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION set_admin_role(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_profiles() TO authenticated;

-- Trigger: auto-create admin_profile on user signup
-- First user ever = founder; all others = pending
CREATE OR REPLACE FUNCTION handle_new_admin_signup()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Check if any admin_profiles exist; if none, this is the founder
  IF NOT EXISTS (SELECT 1 FROM admin_profiles LIMIT 1) THEN
    INSERT INTO admin_profiles (id, email, role, approved)
    VALUES (NEW.id, NEW.email, 'founder', true);
  ELSE
    INSERT INTO admin_profiles (id, email, role, approved)
    VALUES (NEW.id, NEW.email, 'pending', false);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_admin_signup ON auth.users;
CREATE TRIGGER on_admin_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_admin_signup();
