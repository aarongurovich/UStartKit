/*
  # Add search limits tracking

  1. New Tables
    - `search_limits`
      - `ip` (text, primary key)
      - `search_count` (integer)
      - `last_reset` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `search_limits` table
    - Add policy for service role to manage search limits
*/

CREATE TABLE IF NOT EXISTS search_limits (
  ip text PRIMARY KEY,
  search_count integer DEFAULT 0,
  last_reset timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE search_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage search limits"
  ON search_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);