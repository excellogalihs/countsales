import { describe, expect, it } from "vitest";
import { buildReport, periodRange } from "@/lib/reports";

const sales = [
  { created_at: "2026-10-19T03:00:00Z", subtotal: 1_000_000, discount: 50_000, total: 950_000, payment_method: "tunai", sale_items: [{ qty: 2, cost_price: 300_000 }] },
  { created_at: "2026-10-19T04:00:00Z", subtotal: 200_000, discount: 0, total: 200_000, payment_method: "qris", sale_items: [{ qty: 1, cost_price: 120_000 }] },
];
const r = buildReport(sales, [{ expense_date: "2026-10-19", amount: 100_000 }], [{ paid_at: "2026-10-19", amount: 500_000 }]);

describe("reports", () => {
  it("net sales = subtotal - discount, discount counted once", () => { expect(r.sales.net).toBe(1_150_000); expect(r.sales.discount).toBe(50_000); });
  it("HPP uses recorded cost price, not sell price", () => expect(r.pl.cogs).toBe(720_000));
  it("net profit = net - HPP - opex, supplier payments excluded", () => expect(r.pl.netProfit).toBe(330_000));
  it("cash out = supplier payments + opex", () => { expect(r.cash.outflow).toBe(600_000); expect(r.cash.netCash).toBe(550_000); });
  it("week starts Monday", () => expect(periodRange("mingguan", "2026-10-21")).toEqual({ from: "2026-10-19", to: "2026-10-25" }));
  it("month range", () => expect(periodRange("bulanan", "2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" }));
});
