-- Private bucket for the optional store logo referenced by store_settings.logo_path.
-- Migration 0003 created the object policies but not the bucket itself. The app
-- also creates it on demand, so a permission error here is not fatal.
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('store-logos', 'store-logos', false, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
  ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
EXCEPTION WHEN insufficient_privilege OR undefined_table THEN
  RAISE NOTICE 'store-logos bucket left to the application (reason: %)', SQLERRM;
END $$;

-- Ensure receipts have sensible defaults before the first save from /pengaturan.
INSERT INTO public.store_settings (id, name) VALUES (1, 'Count Sales')
ON CONFLICT (id) DO NOTHING;

-- Signed-out visitors must never reach these tables (0003 policies already
-- restrict rows; this removes the leftover grants on the anon role).
REVOKE ALL ON public.user_accounts FROM anon;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.store_settings FROM anon;

-- 0003 omitted the cascade on user_accounts, which would leave orphan rows when
-- an auth user is deleted from the Admin screen.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_accounts_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_accounts
      ADD CONSTRAINT user_accounts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Public bootstrap check: exposes only whether the first Admin exists.
CREATE OR REPLACE FUNCTION public.app_setup_required() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.user_accounts);
$$;
REVOKE ALL ON FUNCTION public.app_setup_required() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_setup_required() TO anon, authenticated;