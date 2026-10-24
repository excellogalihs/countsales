CREATE POLICY input_read ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'input'));
CREATE POLICY input_insert ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'input'));
CREATE POLICY input_update ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'input')) WITH CHECK (public.has_role(auth.uid(), 'input'));
CREATE POLICY input_read ON public.categories FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'input'));
CREATE POLICY input_insert ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'input'));
CREATE POLICY input_update ON public.categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'input')) WITH CHECK (public.has_role(auth.uid(), 'input'));
CREATE POLICY input_read ON public.suppliers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'input'));
CREATE POLICY input_insert ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'input'));
CREATE POLICY input_update ON public.suppliers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'input')) WITH CHECK (public.has_role(auth.uid(), 'input'));
CREATE POLICY input_read ON public.purchases FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'input'));
CREATE POLICY input_read ON public.purchase_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'input'));
CREATE POLICY input_read ON public.supplier_payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'input'));
DO $migration$
DECLARE signature text; definition text;
old_guard text := 'IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),''admin'') THEN RAISE EXCEPTION ''Akses ditolak'' USING ERRCODE=''42501''; END IF;';
new_guard text := 'IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''input'')) THEN RAISE EXCEPTION ''Akses ditolak'' USING ERRCODE=''42501''; END IF;';
BEGIN
  FOREACH signature IN ARRAY ARRAY['public.create_purchase(uuid,uuid,date,jsonb,numeric,text,boolean,text)', 'public.receive_purchase(uuid)'] LOOP
    definition := pg_get_functiondef(signature::regprocedure);
    IF position(old_guard IN definition) = 0 THEN RAISE EXCEPTION 'Expected authorization guard missing: %', signature; END IF;
    definition := replace(definition, old_guard, new_guard);
    IF signature LIKE 'public.create_purchase%' THEN
      definition := replace(definition, new_guard, new_guard || E'\n IF NOT public.has_role(auth.uid(),''admin'') AND coalesce(_paid,0) <> 0 THEN RAISE EXCEPTION ''Hanya Admin dapat mencatat pembayaran supplier'' USING ERRCODE=''42501''; END IF;');
    END IF;
    EXECUTE definition;
  END LOOP;
END $migration$;