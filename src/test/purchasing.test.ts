import { describe, expect, it } from "vitest";
import { purchaseTotal, validateExpense, validatePurchase } from "@/lib/purchasing";

const lines = [{ product_id: "p1", qty: "3", cost_price: "100000" }];

describe("purchase", () => {
  it("totals qty x cost", () => expect(purchaseTotal(lines)).toBe(300000));
  it("rejects paying more than total", () => expect(validatePurchase("s1", lines, 300001)).not.toBeNull());
  it("rejects negative cost", () => expect(validatePurchase("s1", [{ ...lines[0], cost_price: "-1" }], 0)).not.toBeNull());
  it("requires supplier", () => expect(validatePurchase("", lines, 0)).not.toBeNull());
  it("accepts valid purchase", () => expect(validatePurchase("s1", lines, 100000)).toBeNull());
});

describe("expense", () => {
  const f = { expense_date: "2026-10-18", category: "Listrik", description: "", amount: "250000", payment_method: "tunai" };
  it("accepts valid", () => expect(validateExpense(f)).toBeNull());
  it("rejects zero/negative amount", () => {
    expect(validateExpense({ ...f, amount: "0" })).not.toBeNull();
    expect(validateExpense({ ...f, amount: "-5" })).not.toBeNull();
  });
});
