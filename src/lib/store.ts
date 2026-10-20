import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StoreSettings = Tables<"store_settings">;

export const STORE_LOGO_BUCKET = "store-logos";
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const DEFAULT_STORE_NAME = "Count Sales";
export const DEFAULT_RECEIPT_FOOTER = "Terima kasih atas kunjungan Anda";

export type StoreForm = {
  name: string;
  address: string;
  phone: string;
  receipt_header: string;
  receipt_footer: string;
};

export const emptyStoreForm: StoreForm = {
  name: "",
  address: "",
  phone: "",
  receipt_header: "",
  receipt_footer: "",
};

export function storeFormFrom(settings: StoreSettings | null | undefined): StoreForm {
  if (!settings) return { ...emptyStoreForm };
  return {
    name: settings.name,
    address: settings.address,
    phone: settings.phone,
    receipt_header: settings.receipt_header,
    receipt_footer: settings.receipt_footer,
  };
}

/** Returns field errors (Indonesian). Empty object = valid. */
export function validateStoreForm(f: StoreForm): Partial<Record<keyof StoreForm, string>> {
  const e: Partial<Record<keyof StoreForm, string>> = {};
  const name = f.name.trim();
  if (!name) e.name = "Nama toko wajib diisi";
  else if (name.length > 100) e.name = "Nama toko maksimal 100 karakter";
  if (f.address.trim().length > 500) e.address = "Alamat maksimal 500 karakter";
  if (f.phone.trim().length > 30) e.phone = "Nomor telepon maksimal 30 karakter";
  if (f.receipt_header.trim().length > 500) e.receipt_header = "Header struk maksimal 500 karakter";
  if (f.receipt_footer.trim().length > 500) e.receipt_footer = "Footer struk maksimal 500 karakter";
  return e;
}

export function validateLogoFile(file: Pick<File, "size" | "type">): string | null {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type as (typeof ACCEPTED_LOGO_TYPES)[number])) {
    return "Logo harus berupa PNG, JPG, atau WEBP";
  }
  if (file.size > MAX_LOGO_BYTES) return "Ukuran logo maksimal 2 MB";
  if (file.size === 0) return "Berkas logo kosong";
  return null;
}

/** Base64 (no data: prefix) for the Base64-encoded RPC payload. */
export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export const storeSettingsQuery = {
  queryKey: ["store-settings"],
  staleTime: 60_000,
  queryFn: async (): Promise<StoreSettings | null> => {
    const { data, error } = await supabase
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};

/** Short-lived signed URL for the private receipt logo. */
export const storeLogoUrlQuery = (logoPath: string | null | undefined) => ({
  queryKey: ["store-logo", logoPath ?? null],
  enabled: !!logoPath,
  staleTime: 30 * 60_000,
  queryFn: async (): Promise<string | null> => {
    if (!logoPath) return null;
    const { data, error } = await supabase.storage
      .from(STORE_LOGO_BUCKET)
      .createSignedUrl(logoPath, 3600);
    if (error) throw error;
    return data.signedUrl;
  },
});
