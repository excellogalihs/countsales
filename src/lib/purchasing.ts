export const purchaseStatusLabels: Record<string, string> = {
  belum: "Belum Dibayar",
  sebagian: "Dibayar Sebagian",
  lunas: "Lunas",
};

export const expenseCategories = ["Listrik", "Internet", "Sewa", "Gaji", "Transportasi", "Biaya Servis", "Lainnya"];

export const todayJakarta = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

export type PurchaseLine = { product_id: string; qty: string; cost_price: string };

export function purchaseTotal(lines: PurchaseLine[]) {
  return lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.cost_price) || 0), 0);
}

export function validatePurchase(supplierId: string, lines: PurchaseLine[], paid: number): string | null {
  if (!supplierId) return "Pilih supplier";
  if (!lines.length) return "Tambahkan minimal satu barang";
  for (const l of lines) {
    if (!l.product_id) return "Pilih produk di setiap baris";
    const q = Number(l.qty);
    if (!Number.isInteger(q) || q <= 0) return "Jumlah barang harus bilangan bulat lebih dari 0";
    const c = Number(l.cost_price);
    if (l.cost_price.trim() === "" || !Number.isFinite(c) || c < 0) return "Harga modal tidak boleh negatif";
  }
  if (paid < 0) return "Jumlah dibayar tidak boleh negatif";
  if (paid > purchaseTotal(lines)) return "Jumlah dibayar melebihi total";
  return null;
}

export type ExpenseForm = { expense_date: string; category: string; description: string; amount: string; payment_method: string };

export function validateExpense(f: ExpenseForm): string | null {
  if (!f.expense_date) return "Tanggal wajib diisi";
  if (!f.category.trim()) return "Kategori wajib diisi";
  const a = Number(f.amount);
  if (f.amount.trim() === "" || !Number.isFinite(a) || a <= 0) return "Nominal harus lebih dari 0";
  return null;
}

export const formatTanggalPendek = (d: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d + "T00:00:00"));
