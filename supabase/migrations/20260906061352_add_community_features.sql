/*
# Community features: ratings, likes, comments, notifications, shares, reports, community uploads

1. Modified Tables
- `liveries` — add `status` (text, default 'approved'), `rejection_reason` (text, nullable), `user_id` (uuid, nullable, FK to auth.users).
  Existing rows default to 'approved' so all current admin-uploaded liveries remain public.
  Community-uploaded liveries start as 'pending' and require admin approval.

2. New Tables
- `livery_likes` — one like per user per livery. UNIQUE(livery_id, user_id).
- `livery_ratings` — one rating per user per livery (1-5 stars). UNIQUE(livery_id, user_id).
- `comments` — threaded comments on liveries. parent_id for nested replies.
- `comment_likes` — one like per user per comment. UNIQUE(comment_id, user_id).
- `notifications` — per-user notifications.
- `livery_shares` — track share events.
- `reports` — user-submitted reports for liveries and comments.

3. Security
- All new tables have RLS enabled.
- Public read (anon + authenticated) for: livery_likes, livery_ratings, comments (visible only), comment_likes, livery_shares.
- Authenticated write for own data: likes, ratings, comments, comment_likes, notifications (own), shares, reports.
- Admin (authenticated) can manage all comments, reports, and livery statuses.

4. Helper Functions
- get_livery_stats, toggle_livery_like, submit_livery_rating, get_pending_liveries, approve_livery, reject_livery,
  get_moderation_stats, get_analytics_stats, get_popular_liveries, get_popular_creators, get_popular_vehicles,
  create_notification, mark_notification_read, mark_all_notifications_read.
*/

-- ==========================================
-- MODIFY liveries table
-- ==========================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'liveries' AND column_name = 'status') THEN
    ALTER TABLE liveries ADD COLUMN status text NOT NULL DEFAULT 'approved';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'liveries' AND column_name = 'rejection_reason') THEN
    ALTER TABLE liveries ADD COLUMN rejection_reason text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'liveries' AND column_name = 'user_id') THEN
    ALTER TABLE liveries ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "public_read_liveries" ON liveries;
CREATE POLICY "public_read_liveries" ON liveries FOR SELECT
  TO anon, authenticated USING (status = 'approved' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_insert_liveries" ON liveries;
CREATE POLICY "admin_insert_liveries" ON liveries FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_liveries" ON liveries;
CREATE POLICY "admin_update_liveries" ON liveries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_liveries" ON liveries;
CREATE POLICY "admin_delete_liveries" ON liveries FOR DELETE
  TO authenticated USING (true);

-- ==========================================
-- livery_likes
-- ==========================================
CREATE TABLE IF NOT EXISTS livery_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livery_id uuid NOT NULL REFERENCES liveries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(livery_id, user_id)
);

ALTER TABLE livery_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_livery_likes" ON livery_likes;
CREATE POLICY "public_read_livery_likes" ON livery_likes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_livery_like" ON livery_likes;
CREATE POLICY "insert_own_livery_like" ON livery_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_livery_like" ON livery_likes;
CREATE POLICY "delete_own_livery_like" ON livery_likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- livery_ratings
-- ==========================================
CREATE TABLE IF NOT EXISTS livery_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livery_id uuid NOT NULL REFERENCES liveries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(livery_id, user_id)
);

ALTER TABLE livery_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_livery_ratings" ON livery_ratings;
CREATE POLICY "public_read_livery_ratings" ON livery_ratings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_livery_rating" ON livery_ratings;
CREATE POLICY "insert_own_livery_rating" ON livery_ratings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_livery_rating" ON livery_ratings;
CREATE POLICY "update_own_livery_rating" ON livery_ratings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- comments
-- ==========================================
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livery_id uuid NOT NULL REFERENCES liveries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'visible',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_comments" ON comments;
CREATE POLICY "public_read_comments" ON comments FOR SELECT
  TO anon, authenticated USING (status = 'visible' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_comment" ON comments;
CREATE POLICY "insert_own_comment" ON comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_comment" ON comments;
CREATE POLICY "update_own_comment" ON comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_comment" ON comments;
CREATE POLICY "delete_own_comment" ON comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- comment_likes
-- ==========================================
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_comment_likes" ON comment_likes;
CREATE POLICY "public_read_comment_likes" ON comment_likes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_comment_like" ON comment_likes;
CREATE POLICY "insert_own_comment_like" ON comment_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_comment_like" ON comment_likes;
CREATE POLICY "delete_own_comment_like" ON comment_likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- notifications
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  reference_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_notifications" ON notifications;
CREATE POLICY "read_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- livery_shares
-- ==========================================
CREATE TABLE IF NOT EXISTS livery_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livery_id uuid NOT NULL REFERENCES liveries(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  platform text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE livery_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_livery_shares" ON livery_shares;
CREATE POLICY "public_read_livery_shares" ON livery_shares FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_livery_share" ON livery_shares;
CREATE POLICY "insert_livery_share" ON livery_shares FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ==========================================
-- reports
-- ==========================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('livery', 'comment')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_reports" ON reports;
CREATE POLICY "read_reports" ON reports FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_report" ON reports;
CREATE POLICY "insert_own_report" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "update_reports" ON reports;
CREATE POLICY "update_reports" ON reports FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- Indexes
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_livery_likes_livery ON livery_likes(livery_id);
CREATE INDEX IF NOT EXISTS idx_livery_ratings_livery ON livery_ratings(livery_id);
CREATE INDEX IF NOT EXISTS idx_comments_livery ON comments(livery_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_livery_shares_livery ON livery_shares(livery_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_liveries_status ON liveries(status);

-- ==========================================
-- Helper Functions
-- ==========================================

CREATE OR REPLACE FUNCTION get_livery_stats(p_livery_id uuid)
RETURNS TABLE(likes_count bigint, ratings_avg numeric, ratings_count bigint, comments_count bigint, shares_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM livery_likes WHERE livery_id = p_livery_id),
    COALESCE((SELECT AVG(rating) FROM livery_ratings WHERE livery_id = p_livery_id), 0),
    (SELECT COUNT(*) FROM livery_ratings WHERE livery_id = p_livery_id),
    (SELECT COUNT(*) FROM comments WHERE livery_id = p_livery_id AND status = 'visible'),
    (SELECT COUNT(*) FROM livery_shares WHERE livery_id = p_livery_id)
$$;

CREATE OR REPLACE FUNCTION toggle_livery_like(p_livery_id uuid)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  total bigint;
BEGIN
  SELECT id INTO existing_id FROM livery_likes WHERE livery_id = p_livery_id AND user_id = auth.uid();
  IF existing_id IS NOT NULL THEN
    DELETE FROM livery_likes WHERE id = existing_id;
  ELSE
    INSERT INTO livery_likes (livery_id, user_id) VALUES (p_livery_id, auth.uid());
  END IF;
  SELECT COUNT(*) INTO total FROM livery_likes WHERE livery_id = p_livery_id;
  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION submit_livery_rating(p_livery_id uuid, p_rating int)
RETURNS TABLE(avg_rating numeric, rating_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO livery_ratings (livery_id, user_id, rating)
  VALUES (p_livery_id, auth.uid(), p_rating)
  ON CONFLICT (livery_id, user_id)
  DO UPDATE SET rating = p_rating, updated_at = now();
  RETURN QUERY
    SELECT COALESCE(AVG(rating), 0), COUNT(*)
    FROM livery_ratings WHERE livery_id = p_livery_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_pending_liveries()
RETURNS TABLE(id uuid, name text, vehicle_name text, creator text, description text, image_path text, file_path text, file_name text, user_id uuid, created_at timestamptz, rejection_reason text, status text)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, name, vehicle_name, creator, description, image_path, file_path, file_name, user_id, created_at, rejection_reason, status
  FROM liveries WHERE status = 'pending' ORDER BY created_at ASC;
$$;

CREATE OR REPLACE FUNCTION approve_livery(p_livery_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE liveries SET status = 'approved', rejection_reason = NULL WHERE id = p_livery_id;
  INSERT INTO notifications (user_id, type, title, message, reference_id)
  SELECT user_id, 'livery_approved', 'Livery Approved', name || ' has been approved and is now public!', id
  FROM liveries WHERE id = p_livery_id AND user_id IS NOT NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION reject_livery(p_livery_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE liveries SET status = 'rejected', rejection_reason = p_reason WHERE id = p_livery_id;
  INSERT INTO notifications (user_id, type, title, message, reference_id)
  SELECT user_id, 'livery_rejected', 'Livery Rejected', name || ' was rejected: ' || p_reason, id
  FROM liveries WHERE id = p_livery_id AND user_id IS NOT NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION get_moderation_stats()
RETURNS TABLE(pending_count bigint, reported_liveries_count bigint, reported_comments_count bigint, flagged_users_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM liveries WHERE status = 'pending'),
    (SELECT COUNT(*) FROM reports WHERE target_type = 'livery' AND status = 'pending'),
    (SELECT COUNT(*) FROM reports WHERE target_type = 'comment' AND status = 'pending'),
    (SELECT COUNT(DISTINCT reporter_id) FROM reports WHERE status = 'pending');
$$;

CREATE OR REPLACE FUNCTION get_analytics_stats()
RETURNS TABLE(total_users bigint, total_liveries bigint, total_downloads bigint, total_comments bigint, total_likes bigint, total_ratings bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM auth.users),
    (SELECT COUNT(*) FROM liveries WHERE status = 'approved'),
    (SELECT COALESCE(SUM(downloads), 0) FROM liveries),
    (SELECT COUNT(*) FROM comments WHERE status = 'visible'),
    (SELECT COUNT(*) FROM livery_likes),
    (SELECT COUNT(*) FROM livery_ratings);
$$;

CREATE OR REPLACE FUNCTION get_popular_liveries(p_limit int DEFAULT 10)
RETURNS TABLE(id uuid, name text, vehicle_name text, creator text, image_path text, downloads int, likes_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.id, l.name, l.vehicle_name, l.creator, l.image_path, l.downloads,
    (SELECT COUNT(*) FROM livery_likes WHERE livery_id = l.id) AS likes_count
  FROM liveries l WHERE l.status = 'approved'
  ORDER BY l.downloads DESC LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_popular_creators(p_limit int DEFAULT 10)
RETURNS TABLE(creator text, dl_count bigint, livery_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT creator, COALESCE(SUM(downloads), 0) AS dl_count, COUNT(*) AS livery_count
  FROM liveries WHERE status = 'approved' AND creator IS NOT NULL AND creator != ''
  GROUP BY creator ORDER BY dl_count DESC LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_popular_vehicles(p_limit int DEFAULT 10)
RETURNS TABLE(vehicle_name text, livery_count bigint, dl_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT vehicle_name, COUNT(*) AS livery_count, COALESCE(SUM(downloads), 0) AS dl_count
  FROM liveries WHERE status = 'approved' AND vehicle_name IS NOT NULL AND vehicle_name != ''
  GROUP BY vehicle_name ORDER BY dl_count DESC LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_reference_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO notifications (user_id, type, title, message, reference_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_reference_id);
$$;

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE notifications SET is_read = true WHERE id = p_notification_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE notifications SET is_read = true WHERE user_id = auth.uid() AND is_read = false;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_livery_stats(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION toggle_livery_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_livery_rating(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_liveries() TO authenticated;
GRANT EXECUTE ON FUNCTION approve_livery(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_livery(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_moderation_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_liveries(int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_popular_creators(int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_popular_vehicles(int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_notification(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;
