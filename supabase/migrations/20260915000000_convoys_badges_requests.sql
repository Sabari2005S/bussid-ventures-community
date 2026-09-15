/*
# Convoy Events, Verified Creator Badges, and Livery Request Board
*/

-- 1. Verified creator column on admin_profiles
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS is_verified_creator boolean DEFAULT false;

CREATE OR REPLACE FUNCTION toggle_verified_creator(p_email text, p_status boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_founder() THEN
    RAISE EXCEPTION 'Only the founder can grant or revoke verified creator status';
  END IF;

  UPDATE admin_profiles
  SET is_verified_creator = p_status
  WHERE email = p_email;

  RETURN FOUND;
END;
$$;

-- 2. Convoys table
CREATE TABLE IF NOT EXISTS public.convoys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  route_description text NOT NULL,
  start_time timestamptz NOT NULL,
  vehicle_theme text NOT NULL DEFAULT 'All Buses & Liveries Welcome',
  server_region text NOT NULL DEFAULT 'Asia (ID)',
  room_name text NOT NULL,
  room_password text,
  max_participants int NOT NULL DEFAULT 10,
  participants_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming',
  discord_url text,
  whatsapp_url text,
  organizer_name text NOT NULL DEFAULT 'BUSSID Ventures Team',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.convoys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_convoys ON public.convoys;
CREATE POLICY public_read_convoys ON public.convoys FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS admin_manage_convoys ON public.convoys;
CREATE POLICY admin_manage_convoys ON public.convoys FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_convoys_start_time ON public.convoys(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_convoys_status ON public.convoys(status);

-- 3. Convoy RSVPs table
CREATE TABLE IF NOT EXISTS public.convoy_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  convoy_id uuid NOT NULL REFERENCES public.convoys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  in_game_id text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(convoy_id, user_id)
);

ALTER TABLE public.convoy_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_convoy_rsvps ON public.convoy_rsvps;
CREATE POLICY read_convoy_rsvps ON public.convoy_rsvps FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS insert_own_convoy_rsvp ON public.convoy_rsvps;
CREATE POLICY insert_own_convoy_rsvp ON public.convoy_rsvps FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS delete_own_convoy_rsvp ON public.convoy_rsvps;
CREATE POLICY delete_own_convoy_rsvp ON public.convoy_rsvps FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_convoy_rsvps_convoy ON public.convoy_rsvps(convoy_id);
CREATE INDEX IF NOT EXISTS idx_convoy_rsvps_user ON public.convoy_rsvps(user_id);

CREATE OR REPLACE FUNCTION rsvp_for_convoy(
  p_convoy_id uuid,
  p_player_name text,
  p_in_game_id text,
  p_phone text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO convoy_rsvps (convoy_id, user_id, player_name, in_game_id, phone)
  VALUES (p_convoy_id, auth.uid(), p_player_name, p_in_game_id, p_phone)
  ON CONFLICT (convoy_id, user_id) DO NOTHING;

  IF FOUND THEN
    UPDATE convoys SET participants_count = participants_count + 1 WHERE id = p_convoy_id;
  END IF;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_convoy_rsvp(p_convoy_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM convoy_rsvps WHERE convoy_id = p_convoy_id AND user_id = auth.uid();
  IF FOUND THEN
    UPDATE convoys SET participants_count = GREATEST(participants_count - 1, 0) WHERE id = p_convoy_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

-- 4. Livery Requests table
CREATE TABLE IF NOT EXISTS public.livery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  vehicle_name text NOT NULL,
  operator_name text NOT NULL,
  description text,
  reference_image_url text,
  requested_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_email text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_by_name text,
  completed_livery_id uuid REFERENCES public.liveries(id) ON DELETE SET NULL,
  upvotes_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.livery_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_livery_requests ON livery_requests;
CREATE POLICY public_read_livery_requests ON livery_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS authenticated_insert_livery_requests ON livery_requests;
CREATE POLICY authenticated_insert_livery_requests ON livery_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = requested_by);

DROP POLICY IF EXISTS update_livery_requests ON livery_requests;
CREATE POLICY update_livery_requests ON livery_requests FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS delete_livery_requests ON livery_requests;
CREATE POLICY delete_livery_requests ON livery_requests FOR DELETE
  TO authenticated USING (auth.uid() = requested_by OR is_founder());

CREATE INDEX IF NOT EXISTS idx_livery_requests_status ON livery_requests(status);
CREATE INDEX IF NOT EXISTS idx_livery_requests_upvotes ON livery_requests(upvotes_count DESC);

-- 5. Livery Request Upvotes table
CREATE TABLE IF NOT EXISTS public.livery_request_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.livery_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, user_id)
);

ALTER TABLE public.livery_request_upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_livery_request_upvotes ON livery_request_upvotes;
CREATE POLICY read_livery_request_upvotes ON livery_request_upvotes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS insert_own_upvote ON livery_request_upvotes;
CREATE POLICY insert_own_upvote ON livery_request_upvotes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS delete_own_upvote ON livery_request_upvotes;
CREATE POLICY delete_own_upvote ON livery_request_upvotes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION toggle_request_upvote(p_request_id uuid)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_exists boolean;
  v_count int;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM livery_request_upvotes
    WHERE request_id = p_request_id AND user_id = auth.uid()
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM livery_request_upvotes
    WHERE request_id = p_request_id AND user_id = auth.uid();
    UPDATE livery_requests
    SET upvotes_count = GREATEST(upvotes_count - 1, 0)
    WHERE id = p_request_id
    RETURNING upvotes_count INTO v_count;
  ELSE
    INSERT INTO livery_request_upvotes (request_id, user_id)
    VALUES (p_request_id, auth.uid())
    ON CONFLICT (request_id, user_id) DO NOTHING;
    UPDATE livery_requests
    SET upvotes_count = upvotes_count + 1
    WHERE id = p_request_id
    RETURNING upvotes_count INTO v_count;
  END IF;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION claim_livery_request(p_request_id uuid, p_creator_name text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE livery_requests
  SET status = 'claimed',
      claimed_by = auth.uid(),
      claimed_by_name = p_creator_name
  WHERE id = p_request_id AND status = 'open';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION complete_livery_request(p_request_id uuid, p_livery_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE livery_requests
  SET status = 'completed',
      completed_livery_id = p_livery_id
  WHERE id = p_request_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_verified_creator(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION rsvp_for_convoy(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_convoy_rsvp(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_request_upvote(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_livery_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_livery_request(uuid, uuid) TO authenticated;
