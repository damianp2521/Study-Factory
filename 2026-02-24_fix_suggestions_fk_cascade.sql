-- Ensure deleting a profile also deletes related suggestions rows.
-- This prevents delete_user_completely from failing with:
-- suggestions_user_id_fkey (profiles -> suggestions)

DO $$
BEGIN
  IF to_regclass('public.suggestions') IS NULL THEN
    RAISE NOTICE 'public.suggestions does not exist. Skipping FK patch.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'suggestions'
      AND constraint_name = 'suggestions_user_id_fkey'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.suggestions
      DROP CONSTRAINT suggestions_user_id_fkey;
  END IF;

  ALTER TABLE public.suggestions
    ADD CONSTRAINT suggestions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
END
$$;
