CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  contact text, address text, notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO anon, authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers all" ON public.suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE SEQUENCE public.purchases_number_seq;
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  client_ref uuid NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  purchase_date date NOT NULL,
  total numeric(14,2) NOT NULL CHECK (total >= 0),
  paid numeric(14,2) NOT NULL DEFAULT 0 CHECK (paid >= 0),
  remaining numeric(14,2) GENERATED ALWAYS AS (total - paid) STORED,
  status text GENERATED ALWAYS AS (CASE WHEN paid <= 0 THEN 'belum' WHEN paid < total THEN 'sebagian' ELSE 'lunas' END) STORED,
  received boolean NOT NULL DEFAULT false,
  received_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT paid_le_total CHECK (paid <= total)
);
GRANT SELECT ON public.purchases TO anon, authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases read" ON public.purchases FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX purchases_supplier_idx ON public.purchases(supplier_id);

CREATE TABLE public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  qty integer NOT NULL CHECK (qty > 0),
  cost_price numeric(14,2) NOT NULL CHECK (cost_price >= 0),
  line_total numeric(14,2) NOT NULL CHECK (line_total >= 0)
);
GRANT SELECT ON public.purchase_items TO anon, authenticated;
GRANT ALL ON public.purchase_items TO service_role;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_items read" ON public.purchase_items FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX purchase_items_purchase_idx ON public.purchase_items(purchase_id);

CREATE TABLE public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_ref uuid NOT NULL UNIQUE,
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('tunai','transfer','qris')),
  paid_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.supplier_payments TO anon, authenticated;
GRANT ALL ON public.supplier_payments TO service_role;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_payments read" ON public.supplier_payments FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL,
  category text NOT NULL CHECK (length(trim(category)) > 0),
  description text,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('tunai','transfer','qris')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses all" ON public.expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX expenses_date_idx ON public.expenses(expense_date DESC);

-- Receive goods: adds stock exactly once, updates product cost to purchase cost.
CREATE OR REPLACE FUNCTION public.receive_purchase(_purchase_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_received boolean; r record;
BEGIN
  SELECT received INTO v_received FROM purchases WHERE id = _purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pembelian tidak ditemukan'; END IF;
  IF v_received THEN RETURN; END IF;
  FOR r IN SELECT product_id, qty, cost_price FROM purchase_items WHERE purchase_id = _purchase_id LOOP
    UPDATE products SET stock = stock + r.qty, cost_price = r.cost_price, updated_at = now() WHERE id = r.product_id;
  END LOOP;
  UPDATE purchases SET received = true, received_at = now() WHERE id = _purchase_id;
END $$;

CREATE OR REPLACE FUNCTION public.add_supplier_payment(
  _client_ref uuid, _purchase_id uuid, _amount numeric, _method text, _date date
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric; v_paid numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM supplier_payments WHERE client_ref = _client_ref) THEN RETURN; END IF;
  SELECT total, paid INTO v_total, v_paid FROM purchases WHERE id = _purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pembelian tidak ditemukan'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Nominal pembayaran harus lebih dari 0'; END IF;
  IF _amount > v_total - v_paid THEN RAISE EXCEPTION 'Pembayaran melebihi sisa utang'; END IF;
  INSERT INTO supplier_payments (client_ref, purchase_id, amount, method, paid_at)
  VALUES (_client_ref, _purchase_id, _amount, _method, coalesce(_date, (now() AT TIME ZONE 'Asia/Jakarta')::date));
  UPDATE purchases SET paid = paid + _amount WHERE id = _purchase_id;
END $$;

CREATE OR REPLACE FUNCTION public.create_purchase(
  _client_ref uuid, _supplier_id uuid, _date date, _items jsonb,
  _paid numeric, _method text, _receive boolean, _notes text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing uuid; v_id uuid; v_total numeric := 0; v_item jsonb; v_name text; v_qty int; v_cost numeric;
BEGIN
  SELECT id INTO v_existing FROM purchases WHERE client_ref = _client_ref;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Daftar barang kosong'; END IF;
  IF NOT EXISTS (SELECT 1 FROM suppliers WHERE id = _supplier_id) THEN RAISE EXCEPTION 'Supplier tidak ditemukan'; END IF;

  INSERT INTO purchases (number, client_ref, supplier_id, purchase_date, total, notes)
  VALUES ('PB-' || to_char(coalesce(_date, now()::date), 'YYYYMMDD') || '-' || lpad(nextval('purchases_number_seq')::text, 5, '0'),
          _client_ref, _supplier_id, coalesce(_date, (now() AT TIME ZONE 'Asia/Jakarta')::date), 0, nullif(trim(_notes), ''))
  RETURNING id INTO v_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'qty')::int; v_cost := (v_item->>'cost_price')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Jumlah barang tidak valid'; END IF;
    IF v_cost IS NULL OR v_cost < 0 THEN RAISE EXCEPTION 'Harga modal tidak boleh negatif'; END IF;
    SELECT name INTO v_name FROM products WHERE id = (v_item->>'product_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produk tidak ditemukan'; END IF;
    INSERT INTO purchase_items (purchase_id, product_id, product_name, qty, cost_price, line_total)
    VALUES (v_id, (v_item->>'product_id')::uuid, v_name, v_qty, v_cost, v_qty * v_cost);
    v_total := v_total + v_qty * v_cost;
  END LOOP;
  UPDATE purchases SET total = v_total WHERE id = v_id;

  IF coalesce(_paid, 0) > 0 THEN
    PERFORM add_supplier_payment(gen_random_uuid(), v_id, _paid, _method, _date);
  END IF;
  IF _receive THEN PERFORM receive_purchase(v_id); END IF;
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.receive_purchase(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_supplier_payment(uuid, uuid, numeric, text, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_purchase(uuid, uuid, date, jsonb, numeric, text, boolean, text) TO anon, authenticated;