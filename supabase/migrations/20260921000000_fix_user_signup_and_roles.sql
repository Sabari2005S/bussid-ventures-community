/*
# Fix User Signups and Distinguish Player vs Admin Requests

1. Changes:
- Updates `handle_new_admin_signup()` trigger function on `auth.users`:
  - Inspects `NEW.raw_user_meta_data->>'role'`
  - If requested role is 'admin', sets `role = 'pending'`, `approved = false` (requires founder approval)
  - If requested role is 'user' (or not explicitly 'admin'), sets `role = 'user'`, `approved = true` (immediate community access)
  - Preserves first user as 'founder', `approved = true`
- Adds `ensure_user_profile()` function for authenticated users to safely guarantee their profile is set to `role = 'user'`, `approved = true` if currently stuck in 'pending'.
- Adds policy `user_update_own_profile` to allow users to update their own pending record to 'user'.
*/

-- 1. Update trigger to distinguish between admin requests and normal player signups
CREATE OR REPLACE FUNCTION handle_new_admin_signup()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_requested_role text;
BEGIN
  -- Extract requested role from user metadata (defaults to 'user')
  v_requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

  -- First user ever in the system becomes the founder
  IF NOT EXISTS (SELECT 1 FROM admin_profiles LIMIT 1) THEN
    INSERT INTO admin_profiles (id, email, role, approved)
    VALUES (NEW.id, NEW.email, 'founder', true)
    ON CONFLICT (id) DO UPDATE SET role = 'founder', approved = true;
  ELSIF v_requested_role = 'admin' THEN
    -- Admin applicant -> awaits founder approval
    INSERT INTO admin_profiles (id, email, role, approved)
    VALUES (NEW.id, NEW.email, 'pending', false)
    ON CONFLICT (id) DO NOTHING;
  ELSE
    -- Standard player / community user -> immediately active with role 'user'
    INSERT INTO admin_profiles (id, email, role, approved)
    VALUES (NEW.id, NEW.email, 'user', true)
    ON CONFLICT (id) DO UPDATE
    SET role = 'user', approved = true
    WHERE admin_profiles.role = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is active on auth.users
DROP TRIGGER IF EXISTS on_admin_signup ON auth.users;
CREATE TRIGGER on_admin_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_admin_signup();

-- 2. Helper function to ensure an authenticated user has an active 'user' profile
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_email text;
  v_current_role text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT role INTO v_current_role FROM admin_profiles WHERE id = v_uid;

  -- If not registered yet or pending, set to 'user' with approved = true
  IF v_current_role IS NULL THEN
    INSERT INTO admin_profiles (id, email, role, approved)
    VALUES (v_uid, v_email, 'user', true);
  ELSIF v_current_role = 'pending' THEN
    UPDATE admin_profiles
    SET role = 'user', approved = true
    WHERE id = v_uid;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_user_profile() TO authenticated;

-- 3. Policy to allow users to update their own profile from 'pending' to 'user'
DROP POLICY IF EXISTS "user_update_own_profile" ON admin_profiles;
CREATE POLICY "user_update_own_profile" ON admin_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND role = 'pending')
  WITH CHECK (auth.uid() = id AND role = 'user');
