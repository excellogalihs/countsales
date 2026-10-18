import { describe, expect, it } from "vitest";
import { calcTotals } from "@/lib/sales";

const lines = [{ price: 100000, qty: 2 }, { price: 50000, qty: 1 }];

describe("calcTotals", () => {
  it("computes subtotal, total and change for cash", () => {
    const t = calcTotals(lines, 10000, 300000, "tunai");
    expect(t.subtotal).toBe(250000);
    expect(t.total).toBe(240000);
    expect(t.change).toBe(60000);
    expect(t.insufficient).toBe(false);
  });
  it("flags insufficient cash", () => expect(calcTotals(lines, 0, 100000, "tunai").insufficient).toBe(true));
  it("non-cash payment equals total, no change", () => {
    const t = calcTotals(lines, 0, 0, "qris");
    expect(t.received).toBe(250000);
    expect(t.change).toBe(0);
  });
  it("flags discount above subtotal", () => expect(calcTotals(lines, 300000, 0, "transfer").discountTooHigh).toBe(true));
});
