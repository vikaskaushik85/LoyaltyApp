-- ============================================================================
-- PerkUp: Dynamic QR Security Schema Migration
--
-- Upgrades the database from static QR codes to time-based, HMAC-signed
-- dynamic QR codes with replay protection and rate limiting.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================================

-- Enable pgcrypto for HMAC functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. Add qr_secret to cafes ─────────────────────────────────────────────
-- Each cafe gets its own HMAC secret for signing QR payloads.
-- Default to a random 32-byte hex string.

ALTER TABLE cafes
  ADD COLUMN IF NOT EXISTS qr_secret text
    DEFAULT encode(gen_random_bytes(32), 'hex');

-- Back-fill any existing rows that ended up NULL
UPDATE cafes SET qr_secret = encode(gen_random_bytes(32), 'hex')
WHERE qr_secret IS NULL;

ALTER TABLE cafes
  ALTER COLUMN qr_secret SET NOT NULL;

-- ─── 2. Create transactions table (security audit log) ─────────────────────
-- Every scan attempt (valid or not) is logged here for analytics and auditing.

CREATE TABLE IF NOT EXISTS transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cafe_id     uuid NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  nonce       text NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('success', 'expired', 'replay', 'invalid_sig', 'rate_limited', 'pending')),
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_cafe
  ON transactions (user_id, cafe_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_nonce
  ON transactions (nonce);

CREATE INDEX IF NOT EXISTS idx_transactions_cafe_created
  ON transactions (cafe_id, created_at DESC);

-- ─── 3. Create used_nonces table (replay protection) ────────────────────────
-- Stores every successfully consumed nonce so it cannot be reused.

CREATE TABLE IF NOT EXISTS used_nonces (
  nonce       text PRIMARY KEY,
  cafe_id     uuid NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  used_at     timestamptz NOT NULL DEFAULT now()
);

-- Auto-cleanup: drop nonces older than 1 hour (they're useless after 30s anyway)
-- Run via pg_cron or a Supabase scheduled function:
-- DELETE FROM used_nonces WHERE used_at < now() - interval '1 hour';

-- ─── 4. Create notifications table (marketing) ─────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id     uuid NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  title       text NOT NULL,
  message     text NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  target_count int DEFAULT 0,
  created_by  uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_cafe
  ON notifications (cafe_id, sent_at DESC);

-- ─── 5. Create push_tokens table (for Expo push notifications) ─────────────

CREATE TABLE IF NOT EXISTS push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text NOT NULL,
  platform    text DEFAULT 'ios' CHECK (platform IN ('ios', 'android', 'web')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- ─── 6. Add owner_id to cafes (links cafe to business user) ────────────────

ALTER TABLE cafes
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- ─── 7. Row Level Security ─────────────────────────────────────────────────

-- transactions: users see only their own; cafe owners see their cafe's
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Cafe owners see their transactions"
  ON transactions FOR SELECT
  USING (
    cafe_id IN (SELECT id FROM cafes WHERE owner_id = auth.uid())
  );

-- used_nonces: no direct access (only via RPC)
ALTER TABLE used_nonces ENABLE ROW LEVEL SECURITY;

-- notifications: cafe owners manage their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cafe owners manage notifications"
  ON notifications FOR ALL
  USING (
    cafe_id IN (SELECT id FROM cafes WHERE owner_id = auth.uid())
  );

-- push_tokens: users manage their own
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- cafes: owners can read their own cafe's qr_secret
-- (normal users should NOT see qr_secret)
CREATE POLICY "Cafe owners read own secret"
  ON cafes FOR SELECT
  USING (owner_id = auth.uid());

-- Allow all authenticated users to read basic cafe info (name, id)
-- but strip qr_secret via a view or selective column access
-- (The existing cafes RLS may need adjusting based on your setup)
