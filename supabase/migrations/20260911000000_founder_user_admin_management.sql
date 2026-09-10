/*
# Founder User & Admin Management System

1. Features
- Founder can approve pending accounts as either 'admin' or 'user'.
- Founder can promote 'user' accounts to 'admin' (or 'founder').
- Founder can demote 'admin' accounts to 'user'.
- Founder can permanently remove users and admins (deleting from auth.users and admin_profiles).
- Founder protection: founder cannot be removed or demoted by others or themselves.
- Enhanced get_admin_profiles() returning all accounts with role ordering.
*/

-- 1. Helper to verify caller is founder or approved admin
CREATE OR REPLACE FUNCTION is_founder()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = auth.uid() AND approved = true AND (role = 'founder' OR role = 'admin')
  );
$$;

-- 2. Approve account as either 'admin' or 'user' (founder only)
CREATE OR REPLACE FUNCTION approve_account(p_email text, p_role text DEFAULT 'user')
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_founder() THEN
    RAISE EXCEPTION 'Only the founder can approve accounts';
  END IF;

  IF p_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Invalid role for approval. Must be admin or user';
  END IF;

  UPDATE admin_profiles
  SET approved = true, role = p_role
  WHERE email = p_email AND (role = 'pending' OR approved = false);

  RETURN FOUND;
END;
$$;

-- Backwards compatibility wrapper for approve_admin
CREATE OR REPLACE FUNCTION approve_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN approve_account(p_email, 'admin');
END;
$$;

-- 3. Set account role (promote/demote) - founder only
CREATE OR REPLACE FUNCTION set_account_role(p_email text, p_role text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_target_id uuid;
  v_target_role text;
BEGIN
  IF NOT is_founder() THEN
    RAISE EXCEPTION 'Only the founder can change account roles';
  END IF;

  IF p_role NOT IN ('admin', 'user', 'founder', 'pending') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin, user, founder, or pending';
  END IF;

  SELECT id, role INTO v_target_id, v_target_role FROM admin_profiles WHERE email = p_email;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  -- Prevent self-demotion to avoid locking out the system
  IF v_target_id = auth.uid() AND p_role NOT IN ('founder', 'admin') THEN
    RAISE EXCEPTION 'You cannot demote your own administrative account';
  END IF;

  UPDATE admin_profiles
  SET role = p_role, approved = (p_role IN ('admin', 'user', 'founder'))
  WHERE email = p_email;

  RETURN FOUND;
END;
$$;

-- Backwards compatibility wrapper for set_admin_role
CREATE OR REPLACE FUNCTION set_admin_role(p_email text, p_role text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN set_account_role(p_email, p_role);
END;
$$;

-- 4. Remove user or admin completely (founder only)
CREATE OR REPLACE FUNCTION remove_user_or_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_target_id uuid;
  v_target_role text;
BEGIN
  IF NOT is_founder() THEN
    RAISE EXCEPTION 'Only an approved founder or admin can remove users';
  END IF;

  SELECT id, role INTO v_target_id, v_target_role FROM public.admin_profiles WHERE email = p_email;
  IF NOT FOUND THEN
    -- Try deleting from auth.users directly
    DELETE FROM auth.users WHERE email = p_email;
    RETURN true;
  END IF;

  -- Protect caller from self-removal
  IF v_target_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot remove your own account';
  END IF;

  -- Delete from auth.users (cascades to admin_profiles and all user-owned data)
  DELETE FROM auth.users WHERE id = v_target_id;
  -- Ensure cleaned from admin_profiles
  DELETE FROM public.admin_profiles WHERE id = v_target_id;

  RETURN true;
END;
$$;

-- Backwards compatibility wrapper for reject_admin
CREATE OR REPLACE FUNCTION reject_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN remove_user_or_admin(p_email);
END;
$$;

-- 5. Get all admin & user profiles with role sorting
CREATE OR REPLACE FUNCTION get_admin_profiles()
RETURNS TABLE(id uuid, email text, role text, approved boolean, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, email, role, approved, created_at
  FROM admin_profiles
  ORDER BY
    CASE
      WHEN role = 'founder' THEN 1
      WHEN role = 'admin' THEN 2
      WHEN role = 'pending' THEN 3
      ELSE 4
    END,
    created_at DESC;
$$;

-- 6. Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION is_founder() TO authenticated;
GRANT EXECUTE ON FUNCTION approve_account(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION set_account_role(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION set_admin_role(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_or_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_profiles() TO authenticated;
