CREATE TYPE public.app_role AS ENUM ('admin','kasir');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated,service_role;
CREATE POLICY roles_read ON public.user_roles FOR SELECT TO authenticated USING(user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.user_accounts (user_id uuid PRIMARY KEY, username text NOT NULL UNIQUE CHECK(username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.user_accounts TO authenticated;
GRANT ALL ON public.user_accounts TO service_role;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_read ON public.user_accounts FOR SELECT TO authenticated USING(user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.store_settings (id integer PRIMARY KEY DEFAULT 1 CHECK(id=1), name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100), address text NOT NULL DEFAULT '' CHECK(length(address)<=500), phone text NOT NULL DEFAULT '' CHECK(length(phone)<=30), receipt_header text NOT NULL DEFAULT '' CHECK(length(receipt_header)<=500), receipt_footer text NOT NULL DEFAULT '' CHECK(length(receipt_footer)<=500), logo_path text CHECK(logo_path IS NULL OR (length(logo_path)<=200 AND logo_path ~ '^logos/[a-zA-Z0-9._-]+$')), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_read ON public.store_settings FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'kasir'));
CREATE POLICY settings_admin ON public.store_settings FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY logos_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='store-logos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'kasir')));
CREATE POLICY logos_admin ON storage.objects FOR ALL TO authenticated USING(bucket_id='store-logos' AND public.has_role(auth.uid(),'admin')) WITH CHECK(bucket_id='store-logos' AND public.has_role(auth.uid(),'admin') AND name ~ '^logos/[a-zA-Z0-9._-]+$' AND lower(storage.extension(name)) IN ('png','jpg','jpeg','webp'));
DO $$ DECLARE t text; p record; BEGIN
 FOR t IN SELECT unnest(ARRAY['categories','products','suppliers','expenses','purchases','purchase_items','supplier_payments','sales','sale_items']) LOOP
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t); END LOOP;
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
  EXECUTE format('CREATE POLICY admin_read ON public.%I FOR SELECT TO authenticated USING(public.has_role(auth.uid(),''admin''))',t);
  IF t IN ('categories','products','suppliers','expenses') THEN
   EXECUTE format('CREATE POLICY admin_write ON public.%I FOR ALL TO authenticated USING(public.has_role(auth.uid(),''admin'')) WITH CHECK(public.has_role(auth.uid(),''admin''))',t);
  END IF;
  IF t IN ('categories','products','sales','sale_items') THEN
   EXECUTE format('CREATE POLICY cashier_read ON public.%I FOR SELECT TO authenticated USING(public.has_role(auth.uid(),''kasir''))',t);
  END IF;
 END LOOP;
END $$;
DO $$ DECLARE r record; def text; guard text; BEGIN
 FOR r IN SELECT oid,proname,oid::regprocedure::text AS signature FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('create_sale','create_purchase','receive_purchase','add_supplier_payment') LOOP
  guard := CASE WHEN r.proname='create_sale' THEN 'IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''kasir'')) THEN RAISE EXCEPTION ''Akses ditolak'' USING ERRCODE=''42501''; END IF;' ELSE 'IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),''admin'') THEN RAISE EXCEPTION ''Akses ditolak'' USING ERRCODE=''42501''; END IF;' END;
  def := pg_get_functiondef(r.oid);
  def := regexp_replace(def, 'BEGIN', 'BEGIN ' || guard);
  EXECUTE def;
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',r.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',r.signature);
 END LOOP;
END $$;
CREATE FUNCTION public.admin_set_role(_user_id uuid,_role public.app_role) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 LOCK TABLE public.user_roles IN EXCLUSIVE MODE;
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Akses ditolak' USING ERRCODE='42501'; END IF;
 IF _user_id=auth.uid() AND _role<>'admin' THEN RAISE EXCEPTION 'Tidak dapat menurunkan peran sendiri'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_accounts WHERE user_id=_user_id) THEN RAISE EXCEPTION 'Pengguna tidak ditemukan'; END IF;
 INSERT INTO public.user_roles(user_id,role) VALUES(_user_id,_role) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid,public.app_role) TO authenticated;