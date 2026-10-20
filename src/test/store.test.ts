import { describe, expect, it } from "vitest";
import {
  emptyStoreForm,
  storeFormFrom,
  validateLogoFile,
  validateStoreForm,
  MAX_LOGO_BYTES,
} from "@/lib/store";

describe("validateStoreForm", () => {
  it("accepts a filled form", () => {
    expect(validateStoreForm({ ...emptyStoreForm, name: "Count Computer" })).toEqual({});
  });

  it("requires a store name", () => {
    expect(validateStoreForm({ ...emptyStoreForm, name: "   " }).name).toBeTruthy();
  });

  it("enforces database length limits", () => {
    expect(validateStoreForm({ ...emptyStoreForm, name: "a".repeat(101) }).name).toBeTruthy();
    expect(
      validateStoreForm({ ...emptyStoreForm, name: "Toko", address: "a".repeat(501) }).address,
    ).toBeTruthy();
    expect(
      validateStoreForm({ ...emptyStoreForm, name: "Toko", phone: "1".repeat(31) }).phone,
    ).toBeTruthy();
    expect(
      validateStoreForm({ ...emptyStoreForm, name: "Toko", receipt_footer: "a".repeat(501) })
        .receipt_footer,
    ).toBeTruthy();
  });
});

describe("storeFormFrom", () => {
  it("falls back to an empty form when settings are missing", () => {
    expect(storeFormFrom(null)).toEqual(emptyStoreForm);
  });

  it("copies persisted values", () => {
    const form = storeFormFrom({
      id: 1,
      name: "Count Computer",
      address: "Jl. Merdeka 1",
      phone: "0812",
      receipt_header: "Header",
      receipt_footer: "Footer",
      logo_path: "logos/x.png",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    expect(form).toEqual({
      name: "Count Computer",
      address: "Jl. Merdeka 1",
      phone: "0812",
      receipt_header: "Header",
      receipt_footer: "Footer",
    });
  });
});

describe("validateLogoFile", () => {
  it("accepts supported image types within the size limit", () => {
    expect(validateLogoFile({ type: "image/png", size: 1024 })).toBeNull();
    expect(validateLogoFile({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(validateLogoFile({ type: "image/webp", size: MAX_LOGO_BYTES })).toBeNull();
  });

  it("rejects unsupported types, oversized or empty files", () => {
    expect(validateLogoFile({ type: "image/svg+xml", size: 1024 })).toBeTruthy();
    expect(validateLogoFile({ type: "image/png", size: MAX_LOGO_BYTES + 1 })).toBeTruthy();
    expect(validateLogoFile({ type: "image/png", size: 0 })).toBeTruthy();
  });
});
