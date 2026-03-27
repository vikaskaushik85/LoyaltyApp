-- Run this in your Supabase SQL Editor to enable client-side account deletion.
-- Apple App Store requires account deletion (Guideline 5.1.1v).
--
-- This function deletes all user data and then removes the auth user.
-- It uses auth.uid() so it can only delete the calling user's own account.

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user data in dependency order
  DELETE FROM public.user_rewards   WHERE user_id = uid;
  DELETE FROM public.user_loyalty_cards WHERE user_id = uid;
  -- Add any other user-owned tables here

  -- Finally remove the auth user
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
