/*
# Add download history tracking

1. New Tables
- `download_history`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users ON DELETE CASCADE)
  - `livery_id` (uuid, not null, references liveries ON DELETE CASCADE)
  - `file_name` (text, nullable — snapshot of the livery file name at download time)
  - `created_at` (timestamptz, defaults to now())
  - Purpose: records every livery download by a logged-in user so they can see their history and re-download.

2. Indexes
- `idx_download_history_user` on (user_id, created_at DESC) — fast lookup for "my downloads" page.
- `idx_download_history_livery` on (livery_id) — useful for admin analytics per livery.

3. Security (RLS)
- Enable RLS on `download_history`.
- SELECT: authenticated users can only read their own download history rows.
- INSERT: authenticated users can only insert rows for themselves (user_id = auth.uid()).
- UPDATE / DELETE: not needed — history is append-only from the client perspective.

4. Notes
- The `user_id` column has `DEFAULT auth.uid()` so client inserts that omit it still satisfy the INSERT policy.
- Unauthenticated downloads are not tracked (no user to attribute them to).
- A unique constraint is NOT added — users can download the same livery multiple times and each download is a separate history entry.
*/

CREATE TABLE IF NOT EXISTS download_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  livery_id uuid NOT NULL REFERENCES liveries(id) ON DELETE CASCADE,
  file_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_download_history_user ON download_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_download_history_livery ON download_history (livery_id);

ALTER TABLE download_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_downloads" ON download_history;
CREATE POLICY "select_own_downloads"
ON download_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_downloads" ON download_history;
CREATE POLICY "insert_own_downloads"
ON download_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
