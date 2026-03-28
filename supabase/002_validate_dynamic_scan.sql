-- ============================================================================
-- Supabase RPC: validate_dynamic_scan
--
-- Called by the User App when a dynamic QR code is scanned.
-- Performs ALL security checks server-side:
--   1. Parse + validate JSON payload
--   2. Check timestamp freshness (≤ 30 seconds)
--   3. Verify HMAC-SHA256 signature
--   4. Reject replay attacks (nonce already used)
--   5. Enforce rate limit (1 scan per user per cafe per 15 minutes)
--   6. If valid → delegate to record_stamp logic
--
-- QR payload format:
--   { "cafe_id": "uuid", "ts": 1711500000, "nonce": "random-hex", "sig": "hmac-hex" }
--
-- The signature covers: cafe_id + ":" + ts + ":" + nonce
-- signed with the cafe's qr_secret via HMAC-SHA256.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_dynamic_scan(
  p_payload   jsonb,
  p_target    int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       uuid   := auth.uid();
  v_cafe_id       uuid;
  v_ts            bigint;
  v_nonce         text;
  v_sig           text;
  v_cafe_secret   text;
  v_cafe_name     text;
  v_expected_sig  text;
  v_age_seconds   double precision;
  v_last_scan     timestamptz;
  -- record_stamp vars
  v_card_id          uuid;
  v_old_stamps       int;
  v_new_stamps       int;
  v_is_reward        boolean := false;
  v_rewards_redeemed int;
BEGIN
  -- 0. Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- 1. Extract fields from payload
  v_cafe_id := (p_payload ->> 'cafe_id')::uuid;
  v_ts      := (p_payload ->> 'ts')::bigint;
  v_nonce   := p_payload ->> 'nonce';
  v_sig     := p_payload ->> 'sig';

  IF v_cafe_id IS NULL OR v_ts IS NULL OR v_nonce IS NULL OR v_sig IS NULL THEN
    INSERT INTO transactions (user_id, cafe_id, nonce, status)
    VALUES (v_user_id, COALESCE(v_cafe_id, '00000000-0000-0000-0000-000000000000'), COALESCE(v_nonce, 'missing'), 'invalid_sig');
    RETURN jsonb_build_object('error', 'INVALID_PAYLOAD', 'message', 'Missing required fields');
  END IF;

  -- 2. Check timestamp freshness (must be ≤ 30 seconds old)
  v_age_seconds := EXTRACT(EPOCH FROM now()) - v_ts;

  IF v_age_seconds > 30 OR v_age_seconds < -5 THEN
    INSERT INTO transactions (user_id, cafe_id, nonce, status)
    VALUES (v_user_id, v_cafe_id, v_nonce, 'expired');
    RETURN jsonb_build_object('error', 'EXPIRED', 'message', 'QR code has expired. Please ask for a new code.');
  END IF;

  -- 3. Look up cafe and its secret
  SELECT id, qr_secret, name
    INTO v_cafe_id, v_cafe_secret, v_cafe_name
    FROM cafes
   WHERE id = v_cafe_id;

  IF v_cafe_secret IS NULL THEN
    INSERT INTO transactions (user_id, cafe_id, nonce, status)
    VALUES (v_user_id, v_cafe_id, v_nonce, 'invalid_sig');
    RETURN jsonb_build_object('error', 'UNKNOWN_CAFE', 'message', 'Cafe not found');
  END IF;

  -- 4. Verify HMAC-SHA256 signature
  --    The message is:  cafe_id:ts:nonce
  v_expected_sig := encode(
    extensions.hmac(
      v_cafe_id::text || ':' || v_ts::text || ':' || v_nonce,
      v_cafe_secret,
      'sha256'
    ),
    'hex'
  );

  IF v_sig <> v_expected_sig THEN
    INSERT INTO transactions (user_id, cafe_id, nonce, status)
    VALUES (v_user_id, v_cafe_id, v_nonce, 'invalid_sig');
    RETURN jsonb_build_object('error', 'INVALID_SIGNATURE', 'message', 'Invalid QR code. This code may have been tampered with.');
  END IF;

  -- 5. Replay protection — check if nonce was already used
  IF EXISTS (SELECT 1 FROM used_nonces WHERE nonce = v_nonce) THEN
    INSERT INTO transactions (user_id, cafe_id, nonce, status)
    VALUES (v_user_id, v_cafe_id, v_nonce, 'replay');
    RETURN jsonb_build_object('error', 'REPLAY', 'message', 'This QR code has already been scanned. Please ask for a new code.');
  END IF;

  -- 6. Rate limiting — 1 scan per user per cafe per 15 minutes
  SELECT MAX(created_at) INTO v_last_scan
    FROM transactions
   WHERE user_id = v_user_id
     AND cafe_id = v_cafe_id
     AND status = 'success';

  IF v_last_scan IS NOT NULL
     AND v_last_scan > now() - interval '15 minutes' THEN
    INSERT INTO transactions (user_id, cafe_id, nonce, status)
    VALUES (v_user_id, v_cafe_id, v_nonce, 'rate_limited');
    RETURN jsonb_build_object(
      'error', 'RATE_LIMITED',
      'message', 'Please wait 15 minutes between visits.',
      'retry_after', EXTRACT(EPOCH FROM (v_last_scan + interval '15 minutes' - now()))::int
    );
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- ALL CHECKS PASSED — record the stamp
  -- ═══════════════════════════════════════════════════════════════════════════

  -- Mark nonce as used
  INSERT INTO used_nonces (nonce, cafe_id) VALUES (v_nonce, v_cafe_id);

  -- Log successful transaction
  INSERT INTO transactions (user_id, cafe_id, nonce, status)
  VALUES (v_user_id, v_cafe_id, v_nonce, 'success');

  -- Record stamp (inline from record_stamp logic)
  SELECT id, stamps, COALESCE(rewards_redeemed, 0)
    INTO v_card_id, v_old_stamps, v_rewards_redeemed
    FROM user_loyalty_cards
   WHERE user_id = v_user_id::text
     AND cafe_id = v_cafe_id
   FOR UPDATE;

  IF v_card_id IS NULL THEN
    INSERT INTO user_loyalty_cards (user_id, cafe_id, stamps, rewards_redeemed)
    VALUES (v_user_id::text, v_cafe_id, 1, 0)
    RETURNING id INTO v_card_id;
    v_new_stamps := 1;
  ELSE
    v_new_stamps := v_old_stamps + 1;

    IF v_new_stamps % p_target = 0 THEN
      v_is_reward := true;
      v_rewards_redeemed := v_rewards_redeemed + 1;

      UPDATE user_loyalty_cards
         SET stamps           = 0,
             rewards_redeemed = v_rewards_redeemed
       WHERE id = v_card_id;

      INSERT INTO user_rewards (user_id, cafe_id, status)
      VALUES (v_user_id::text, v_cafe_id, 'unclaimed');
    ELSE
      UPDATE user_loyalty_cards
         SET stamps = v_new_stamps
       WHERE id = v_card_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success',    true,
    'new_stamps', v_new_stamps,
    'is_reward',  v_is_reward,
    'card_id',    v_card_id,
    'cafe_name',  v_cafe_name
  );
END;
$$;

-- Grant access
REVOKE ALL ON FUNCTION validate_dynamic_scan(jsonb, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION validate_dynamic_scan(jsonb, int) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- Helper: get_cafe_secret (for Business App to generate QR locally)
-- Only callable by the cafe owner.
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_cafe_secret(p_cafe_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT qr_secret INTO v_secret
    FROM cafes
   WHERE id = p_cafe_id
     AND owner_id = auth.uid();

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You do not own this cafe';
  END IF;

  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION get_cafe_secret(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_cafe_secret(uuid) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- Dashboard queries as RPC functions (for Business App)
-- ──────────────────────────────────────────────────────────────────────────

-- Top visitors for a cafe
CREATE OR REPLACE FUNCTION get_top_visitors(p_cafe_id uuid, p_limit int DEFAULT 10)
RETURNS TABLE(user_id uuid, visit_count bigint, last_visit timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM cafes WHERE id = p_cafe_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  RETURN QUERY
    SELECT t.user_id, COUNT(*)::bigint AS visit_count, MAX(t.created_at) AS last_visit
      FROM transactions t
     WHERE t.cafe_id = p_cafe_id
       AND t.status = 'success'
     GROUP BY t.user_id
     ORDER BY visit_count DESC
     LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION get_top_visitors(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_top_visitors(uuid, int) TO authenticated;

-- Daily stats for a cafe
CREATE OR REPLACE FUNCTION get_daily_stats(p_cafe_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today     bigint;
  v_yesterday bigint;
  v_week      bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cafes WHERE id = p_cafe_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT COUNT(*) INTO v_today
    FROM transactions
   WHERE cafe_id = p_cafe_id
     AND status = 'success'
     AND created_at >= date_trunc('day', now());

  SELECT COUNT(*) INTO v_yesterday
    FROM transactions
   WHERE cafe_id = p_cafe_id
     AND status = 'success'
     AND created_at >= date_trunc('day', now()) - interval '1 day'
     AND created_at <  date_trunc('day', now());

  SELECT COUNT(*) INTO v_week
    FROM transactions
   WHERE cafe_id = p_cafe_id
     AND status = 'success'
     AND created_at >= now() - interval '7 days';

  RETURN jsonb_build_object(
    'today',     v_today,
    'yesterday', v_yesterday,
    'this_week', v_week
  );
END;
$$;

REVOKE ALL ON FUNCTION get_daily_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_daily_stats(uuid) TO authenticated;

-- Get recent scan activity for a cafe (for live feed)
CREATE OR REPLACE FUNCTION get_recent_scans(p_cafe_id uuid, p_limit int DEFAULT 20)
RETURNS TABLE(id uuid, user_id uuid, status text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cafes WHERE id = p_cafe_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  RETURN QUERY
    SELECT t.id, t.user_id, t.status, t.created_at
      FROM transactions t
     WHERE t.cafe_id = p_cafe_id
     ORDER BY t.created_at DESC
     LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION get_recent_scans(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_recent_scans(uuid, int) TO authenticated;
