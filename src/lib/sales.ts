import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "tunai" | "transfer" | "qris";
export const paymentLabels: Record<PaymentMethod, string> = {
  tunai: "Tunai",
  transfer: "Transfer Bank",
  qris: "QRIS",
};

export type CartLine = { product_id: string; name: string; sku: string; unit: string; price: number; stock: number; qty: number };

export function calcTotals(lines: Pick<CartLine, "price" | "qty">[], discount: number, paid: number, method: PaymentMethod) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const d = Math.max(0, discount || 0);
  const total = Math.max(0, subtotal - d);
  const received = method === "tunai" ? paid || 0 : total;
  return { subtotal, discount: d, total, received, change: Math.max(0, received - total), discountTooHigh: d > subtotal, insufficient: received < total };
}

export const saleDetailQuery = (id: string) => ({
  queryKey: ["sale", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("sales").select("*, sale_items(*)").eq("id", id).single();
    if (error) throw error;
    return data;
  },
});

/** Jakarta day boundaries for a yyyy-mm-dd string. */
export const dayStart = (d: string) => `${d}T00:00:00+07:00`;
export const dayEnd = (d: string) => `${d}T23:59:59.999+07:00`;

export const formatWaktu = (d: string | Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(d));
