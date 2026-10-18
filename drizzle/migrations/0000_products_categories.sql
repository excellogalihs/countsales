CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories all" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  sku text NOT NULL UNIQUE CHECK (length(trim(sku)) > 0),
  barcode text,
  brand text,
  model text,
  category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
  cost_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  sell_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (sell_price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock integer NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  unit text NOT NULL DEFAULT 'pcs',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products all" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX products_category_idx ON public.products(category_id);

INSERT INTO public.categories (name) VALUES
('LCD/Monitor'),('Flash Drive'),('Printer'),('Tinta'),('RAM'),('SSD/HDD'),('Keyboard'),('Mouse'),('Kabel'),('Adaptor'),('Komponen PC'),('Aksesori');