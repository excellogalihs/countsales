export type Period = "harian" | "mingguan" | "bulanan" | "tahunan" | "khusus";
export const periodLabels: Record<Period, string> = {
  harian: "Hari ini", mingguan: "Minggu ini", bulanan: "Bulan ini", tahunan: "Tahun ini", khusus: "Rentang khusus",
};

const shift = (d: string, days: number) => {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + days);
  return x.toISOString().slice(0, 10);
};

/** Date range (inclusive yyyy-mm-dd) for a period, relative to `today` (Jakarta). Week starts Monday. */
export function periodRange(p: Period, today: string, from = "", to = ""): { from: string; to: string } {
  if (p === "harian") return { from: today, to: today };
  if (p === "mingguan") {
    const dow = (new Date(today + "T00:00:00Z").getUTCDay() + 6) % 7;
    const start = shift(today, -dow);
    return { from: start, to: shift(start, 6) };
  }
  if (p === "bulanan") {
    const [y, m] = today.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: `${today.slice(0, 7)}-01`, to: `${today.slice(0, 7)}-${String(last).padStart(2, "0")}` };
  }
  if (p === "tahunan") return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
  return { from: from || today, to: to || from || today };
}

export const jakartaDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(iso));

type SaleRow = { created_at: string; subtotal: number; discount: number; total: number; payment_method: string; sale_items: { qty: number; cost_price: number }[] };
type Expense = { expense_date: string; amount: number };
type Payment = { paid_at: string; amount: number };

const n = (v: unknown) => Number(v) || 0;
const sum = <T>(a: T[], f: (x: T) => number) => a.reduce((s, x) => s + f(x), 0);
export const saleCogs = (s: SaleRow) => sum(s.sale_items, (i) => n(i.qty) * n(i.cost_price));

export function buildReport(sales: SaleRow[], expenses: Expense[], payments: Payment[]) {
  const gross = sum(sales, (s) => n(s.subtotal));
  const discount = sum(sales, (s) => n(s.discount));
  const net = sum(sales, (s) => n(s.total));
  const cogs = sum(sales, saleCogs);
  const opex = sum(expenses, (e) => n(e.amount));
  const supplierPaid = sum(payments, (p) => n(p.amount));
  const byMethod: Record<string, number> = {};
  for (const s of sales) byMethod[s.payment_method] = (byMethod[s.payment_method] ?? 0) + n(s.total);
  return {
    sales: { count: sales.length, gross, discount, returns: 0, net },
    pl: { net, cogs, grossProfit: net - cogs, opex, netProfit: net - cogs - opex },
    // POS sales are always paid in full, so cash received = net sales total (change already excluded).
    cash: { inflow: net, byMethod, supplierPaid, opex, outflow: supplierPaid + opex, netCash: net - supplierPaid - opex },
  };
}

/** Daily (or monthly when monthly=true) buckets for charting. */
export function buildSeries(sales: SaleRow[], expenses: Expense[], monthly: boolean) {
  const key = (d: string) => (monthly ? d.slice(0, 7) : d);
  const m = new Map<string, { label: string; penjualan: number; laba: number }>();
  const get = (k: string) => m.get(k) ?? m.set(k, { label: k, penjualan: 0, laba: 0 }).get(k)!;
  for (const s of sales) { const b = get(key(jakartaDate(s.created_at))); b.penjualan += n(s.total); b.laba += n(s.total) - saleCogs(s); }
  for (const e of expenses) get(key(e.expense_date)).laba -= n(e.amount);
  return [...m.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function toCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((c) => { const s = String(c); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
}
