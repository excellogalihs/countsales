CREATE SEQUENCE public.sales_number_seq;

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  client_ref uuid NOT NULL UNIQUE,
  subtotal numeric(14,2) NOT NULL CHECK (subtotal >= 0),
  discount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric(14,2) NOT NULL CHECK (total >= 0),
  paid numeric(14,2) NOT NULL CHECK (paid >= 0),
  change numeric(14,2) NOT NULL CHECK (change >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('tunai','transfer','qris')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sales TO anon, authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales read" ON public.sales FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  sku text NOT NULL,
  unit text NOT NULL,
  qty integer NOT NULL CHECK (qty > 0),
  price numeric(14,2) NOT NULL CHECK (price >= 0),
  cost_price numeric(14,2) NOT NULL CHECK (cost_price >= 0),
  line_total numeric(14,2) NOT NULL CHECK (line_total >= 0)
);
GRANT SELECT ON public.sale_items TO anon, authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_items read" ON public.sale_items FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX sale_items_sale_idx ON public.sale_items(sale_id);
CREATE INDEX sales_created_idx ON public.sales(created_at DESC);

-- Atomic sale: validates stock with row locks, saves sale + items, decrements stock.
-- Idempotent on client_ref: repeated calls return the existing sale.
CREATE OR REPLACE FUNCTION public.create_sale(
  _client_ref uuid, _items jsonb, _discount numeric, _paid numeric, _method text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing uuid; v_sale uuid; v_subtotal numeric := 0; v_total numeric;
  v_item jsonb; v_prod products%ROWTYPE; v_qty int; v_number text;
BEGIN
  SELECT id INTO v_existing FROM sales WHERE client_ref = _client_ref;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Keranjang kosong'; END IF;
  IF _method NOT IN ('tunai','transfer','qris') THEN RAISE EXCEPTION 'Metode pembayaran tidak valid'; END IF;
  IF coalesce(_discount,0) < 0 THEN RAISE EXCEPTION 'Diskon tidak boleh negatif'; END IF;

  -- lock & validate
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'qty')::int;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Jumlah barang tidak valid'; END IF;
    SELECT * INTO v_prod FROM products WHERE id = (v_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produk tidak ditemukan'; END IF;
    IF v_prod.stock < v_qty THEN
      RAISE EXCEPTION 'Stok % tidak cukup (tersisa %)', v_prod.name, v_prod.stock;
    END IF;
    v_subtotal := v_subtotal + v_prod.sell_price * v_qty;
  END LOOP;

  IF coalesce(_discount,0) > v_subtotal THEN RAISE EXCEPTION 'Diskon melebihi subtotal'; END IF;
  v_total := v_subtotal - coalesce(_discount,0);
  IF _method = 'tunai' AND coalesce(_paid,0) < v_total THEN RAISE EXCEPTION 'Uang diterima kurang dari total'; END IF;

  v_number := 'TRX-' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD') || '-' || lpad(nextval('sales_number_seq')::text, 5, '0');

  INSERT INTO sales (number, client_ref, subtotal, discount, total, paid, change, payment_method)
  VALUES (v_number, _client_ref, v_subtotal, coalesce(_discount,0), v_total,
          CASE WHEN _method = 'tunai' THEN _paid ELSE v_total END,
          CASE WHEN _method = 'tunai' THEN _paid - v_total ELSE 0 END, _method)
  RETURNING id INTO v_sale;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'qty')::int;
    SELECT * INTO v_prod FROM products WHERE id = (v_item->>'product_id')::uuid;
    INSERT INTO sale_items (sale_id, product_id, product_name, sku, unit, qty, price, cost_price, line_total)
    VALUES (v_sale, v_prod.id, v_prod.name, v_prod.sku, v_prod.unit, v_qty, v_prod.sell_price, v_prod.cost_price, v_prod.sell_price * v_qty);
    UPDATE products SET stock = stock - v_qty, updated_at = now() WHERE id = v_prod.id;
  END LOOP;

  RETURN v_sale;
END $$;
GRANT EXECUTE ON FUNCTION public.create_sale(uuid, jsonb, numeric, numeric, text) TO anon, authenticated;