-- ============================================================================
-- Supabase RPC: record_stamp
--
-- Single transactional function that:
--   1. Records the scan
--   2. Gets or creates the loyalty card
--   3. Increments stamps
--   4. If stamps == target → resets to 0, bumps rewards_redeemed,
--      inserts a row into user_rewards
--
-- Run this in the Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION record_stamp(
  p_user_id    text,
  p_cafe_id    uuid,
  p_qr_code    text,
  p_target     int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_card_id          uuid;
  v_old_stamps       int;
  v_new_stamps       int;
  v_is_reward        boolean := false;
  v_rewards_redeemed int;
BEGIN
  -- 1. Record the scan (audit trail — always inserted)
  INSERT INTO scans (user_id, cafe_id, qr_code)
  VALUES (p_user_id, p_cafe_id, p_qr_code);

  -- 2. Get or create the loyalty card (with row-level lock to prevent races)
  SELECT id, stamps, COALESCE(rewards_redeemed, 0)
    INTO v_card_id, v_old_stamps, v_rewards_redeemed
    FROM user_loyalty_cards
   WHERE user_id = p_user_id
     AND cafe_id = p_cafe_id
   FOR UPDATE;

  IF v_card_id IS NULL THEN
    -- First visit to this cafe — create card with 1 stamp
    INSERT INTO user_loyalty_cards (user_id, cafe_id, stamps, rewards_redeemed)
    VALUES (p_user_id, p_cafe_id, 1, 0)
    RETURNING id INTO v_card_id;

    v_new_stamps := 1;
  ELSE
    v_new_stamps := v_old_stamps + 1;

    IF v_new_stamps % p_target = 0 THEN
      -- Reward earned!
      v_is_reward := true;
      v_rewards_redeemed := v_rewards_redeemed + 1;

      -- Reset stamps to 0 and bump reward counter
      UPDATE user_loyalty_cards
         SET stamps           = 0,
             rewards_redeemed = v_rewards_redeemed
       WHERE id = v_card_id;

      -- Persist the claimable reward
      INSERT INTO user_rewards (user_id, cafe_id, status)
      VALUES (p_user_id, p_cafe_id, 'unclaimed');
    ELSE
      -- Normal stamp increment
      UPDATE user_loyalty_cards
         SET stamps = v_new_stamps
       WHERE id = v_card_id;
    END IF;
  END IF;

  -- 3. Return everything the frontend needs in one shot
  RETURN jsonb_build_object(
    'new_stamps',   v_new_stamps,
    'is_reward',    v_is_reward,
    'card_id',      v_card_id
  );
END;
$$;
