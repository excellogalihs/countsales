import { describe, expect, it } from "vitest";
import { emptyProductForm, isLowStock, validateProduct } from "@/lib/catalog";

const valid = { ...emptyProductForm, name: "Monitor 24", sku: "MON-24", cost_price: "1000000", sell_price: "1200000" };

describe("validateProduct", () => {
  it("accepts a valid product", () => expect(validateProduct(valid)).toEqual({}));
  it("rejects negative cost price", () => expect(validateProduct({ ...valid, cost_price: "-1" }).cost_price).toBeDefined());
  it("rejects negative sell price", () => expect(validateProduct({ ...valid, sell_price: "-5" }).sell_price).toBeDefined());
  it("rejects negative stock", () => expect(validateProduct({ ...valid, stock: "-2" }).stock).toBeDefined());
  it("requires SKU", () => expect(validateProduct({ ...valid, sku: " " }).sku).toBeDefined());
});

describe("isLowStock", () => {
  it("flags stock at or below minimum", () => {
    expect(isLowStock({ stock: 5, min_stock: 5 })).toBe(true);
    expect(isLowStock({ stock: 6, min_stock: 5 })).toBe(false);
  });
});
