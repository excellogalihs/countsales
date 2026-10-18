import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Category = Tables<"categories">;
export type Product = Tables<"products">;

export type ProductForm = {
  name: string;
  sku: string;
  barcode: string;
  brand: string;
  model: string;
  category_id: string;
  cost_price: string;
  sell_price: string;
  stock: string;
  min_stock: string;
  unit: string;
};

export const emptyProductForm: ProductForm = {
  name: "", sku: "", barcode: "", brand: "", model: "", category_id: "",
  cost_price: "", sell_price: "", stock: "0", min_stock: "5", unit: "pcs",
};

/** Returns field errors (Indonesian). Empty object = valid. */
export function validateProduct(f: ProductForm): Partial<Record<keyof ProductForm, string>> {
  const e: Partial<Record<keyof ProductForm, string>> = {};
  if (!f.name.trim()) e.name = "Nama produk wajib diisi";
  if (!f.sku.trim()) e.sku = "SKU wajib diisi";
  const num = (k: keyof ProductForm, label: string, int = false) => {
    const raw = f[k].trim();
    if (raw === "") { e[k] = `${label} wajib diisi`; return; }
    const n = Number(raw);
    if (!Number.isFinite(n)) e[k] = `${label} harus berupa angka`;
    else if (n < 0) e[k] = `${label} tidak boleh negatif`;
    else if (int && !Number.isInteger(n)) e[k] = `${label} harus bilangan bulat`;
  };
  num("cost_price", "Harga modal");
  num("sell_price", "Harga jual");
  num("stock", "Stok", true);
  num("min_stock", "Batas stok menipis", true);
  if (!f.unit.trim()) e.unit = "Satuan wajib diisi";
  return e;
}

export const isLowStock = (p: Pick<Product, "stock" | "min_stock">) => p.stock <= p.min_stock;

export function toProductRow(f: ProductForm) {
  const opt = (s: string) => (s.trim() ? s.trim() : null);
  return {
    name: f.name.trim(),
    sku: f.sku.trim(),
    barcode: opt(f.barcode),
    brand: opt(f.brand),
    model: opt(f.model),
    category_id: f.category_id || null,
    cost_price: Number(f.cost_price),
    sell_price: Number(f.sell_price),
    stock: Number(f.stock),
    min_stock: Number(f.min_stock),
    unit: f.unit.trim(),
    updated_at: new Date().toISOString(),
  };
}

export function dbErrorMessage(err: { code?: string; message: string }) {
  if (err.code === "23505") return err.message.includes("sku") ? "SKU sudah digunakan produk lain" : "Nama sudah digunakan";
  if (err.code === "23503") return "Kategori masih digunakan oleh produk";
  if (err.code === "23514") return "Nilai tidak valid (tidak boleh negatif atau kosong)";
  return "Gagal menyimpan: " + err.message;
}

export const categoriesQuery = {
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    return data;
  },
};

export const productsQuery = {
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*").order("name");
    if (error) throw error;
    return data;
  },
};
