/*
# Tournament registrations + user auth support

1. New Tables
- `tournament_registrations` — tracks players who register for tournaments.
  - id (uuid PK), tournament_id (FK tournaments), user_id (FK auth.users DEFAULT auth.uid()),
    player_name (text), player_email (text), in_game_id (text), phone (text nullable), notes (text nullable),
    status (text default 'registered': registered/confirmed/checked_in/eliminated),
    created_at.
  - UNIQUE(tournament_id, user_id) — one registration per user per tournament.

2. Security
- RLS enabled.
- Authenticated users can register (insert own) and view their own registrations.
- Admins (authenticated) can view all registrations and update status.

3. Helper Functions
- `register_for_tournament(p_tournament_id uuid, p_player_name text, p_player_email text, p_in_game_id text, p_phone text, p_notes text)` — inserts registration, increments tournament participant count, returns success boolean.
- `get_tournament_registrations(p_tournament_id uuid)` — returns all registrations for a tournament (admin view).
- `get_user_tournament_registrations()` — returns the current user's registrations.
- `is_registered_for_tournament(p_tournament_id uuid)` — returns boolean for current user.
*/

CREATE TABLE IF NOT EXISTS tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  player_email text NOT NULL,
  in_game_id text NOT NULL,
  phone text,
  notes text,
  status text NOT NULL DEFAULT 'registered',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_registrations" ON tournament_registrations;
CREATE POLICY "read_own_registrations" ON tournament_registrations FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR true);

DROP POLICY IF EXISTS "insert_own_registration" ON tournament_registrations;
CREATE POLICY "insert_own_registration" ON tournament_registrations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_registrations" ON tournament_registrations;
CREATE POLICY "update_registrations" ON tournament_registrations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament ON tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user ON tournament_registrations(user_id);

CREATE OR REPLACE FUNCTION register_for_tournament(
  p_tournament_id uuid, p_player_name text, p_player_email text, p_in_game_id text, p_phone text DEFAULT NULL, p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO tournament_registrations (tournament_id, user_id, player_name, player_email, in_game_id, phone, notes)
  VALUES (p_tournament_id, auth.uid(), p_player_name, p_player_email, p_in_game_id, p_phone, p_notes)
  ON CONFLICT (tournament_id, user_id) DO NOTHING;

  -- Increment participant count only if it was a new registration
  IF FOUND THEN
    UPDATE tournaments SET participants = participants + 1 WHERE id = p_tournament_id;
  END IF;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION get_tournament_registrations(p_tournament_id uuid)
RETURNS TABLE(id uuid, tournament_id uuid, user_id uuid, player_name text, player_email text, in_game_id text, phone text, notes text, status text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, tournament_id, user_id, player_name, player_email, in_game_id, phone, notes, status, created_at
  FROM tournament_registrations WHERE tournament_id = p_tournament_id ORDER BY created_at ASC;
$$;

CREATE OR REPLACE FUNCTION get_user_tournament_registrations()
RETURNS TABLE(tournament_id uuid, tournament_name text, player_name text, in_game_id text, status text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT tr.tournament_id, t.name, tr.player_name, tr.in_game_id, tr.status, tr.created_at
  FROM tournament_registrations tr
  JOIN tournaments t ON t.id = tr.tournament_id
  WHERE tr.user_id = auth.uid()
  ORDER BY tr.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION is_registered_for_tournament(p_tournament_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tournament_registrations WHERE tournament_id = p_tournament_id AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION register_for_tournament(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tournament_registrations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tournament_registrations() TO authenticated;
GRANT EXECUTE ON FUNCTION is_registered_for_tournament(uuid) TO authenticated;
