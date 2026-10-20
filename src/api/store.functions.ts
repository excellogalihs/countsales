import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { assertAdmin } from "@/api/guard";
import {
  ACCEPTED_LOGO_TYPES,
  MAX_LOGO_BYTES,
  STORE_LOGO_BUCKET,
  validateStoreForm,
  type StoreForm,
} from "@/lib/store";

type Input = Record<string, unknown>;

function asRecord(input: unknown): Input {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Data tidak valid.");
  }
  return input as Input;
}

function readText(input: Input, key: string): string {
  const value = input[key];
  if (typeof value !== "string") throw new Error("Data tidak valid.");
  return value;
}

type LogoPayload = { data: string; contentType: string };

function readLogo(input: Input): LogoPayload | undefined {
  const value = input["logo"];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("Data logo tidak valid.");
  const record = value as Input;
  const data = record["data"];
  const contentType = record["contentType"];
  if (typeof data !== "string" || !data) throw new Error("Data logo tidak valid.");
  if (
    typeof contentType !== "string" ||
    !ACCEPTED_LOGO_TYPES.includes(contentType as (typeof ACCEPTED_LOGO_TYPES)[number])
  ) {
    throw new Error("Logo harus berupa PNG, JPG, atau WEBP");
  }
  return { data, contentType };
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function decodeBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function ensureLogoBucket(admin: SupabaseClient<Database>): Promise<void> {
  const { data: bucket } = await admin.storage.getBucket(STORE_LOGO_BUCKET);
  if (bucket) return;
  const { error } = await admin.storage.createBucket(STORE_LOGO_BUCKET, {
    public: false,
    fileSizeLimit: MAX_LOGO_BYTES,
    allowedMimeTypes: [...ACCEPTED_LOGO_TYPES],
  });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error("Gagal menyiapkan penyimpanan logo.");
  }
}

/**
 * Admin: validates and persists store details, plus an optional logo upload.
 * The database CHECK constraints are the final validation layer; the RLS policy
 * on `store_settings` only lets Admins write. The logo lives in the private
 * `store-logos` bucket and is uploaded with the service-role key (the bucket
 * itself is created on demand if the migration has not run yet).
 */
export const saveStoreSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const record = asRecord(input);
    const fields: StoreForm = {
      name: readText(record, "name"),
      address: readText(record, "address"),
      phone: readText(record, "phone"),
      receipt_header: readText(record, "receipt_header"),
      receipt_footer: readText(record, "receipt_footer"),
    };
    const logo = readLogo(record);
    const rawRemove = record["removeLogo"];
    if (rawRemove !== undefined && typeof rawRemove !== "boolean") {
      throw new Error("Data tidak valid.");
    }
    const errors = validateStoreForm(fields);
    const firstError = Object.values(errors)[0];
    if (firstError) throw new Error(firstError);
    return { ...fields, removeLogo: rawRemove === true, logo };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const form: StoreForm = {
      name: data.name.trim(),
      address: data.address.trim(),
      phone: data.phone.trim(),
      receipt_header: data.receipt_header.trim(),
      receipt_footer: data.receipt_footer.trim(),
    };

    const { data: current, error: readError } = await context.supabase
      .from("store_settings")
      .select("logo_path")
      .eq("id", 1)
      .maybeSingle();
    if (readError) throw new Error("Gagal membaca pengaturan toko.");

    const needsStorage = Boolean(data.logo || data.removeLogo);
    let admin: SupabaseClient<Database> | null = null;
    if (needsStorage) {
      const mod = await import("@/integrations/supabase/client.server");
      admin = mod.supabaseAdmin;
    }

    let logoPath: string | null = current?.logo_path ?? null;
    let uploadedPath: string | null = null;

    if (data.logo) {
      const bytes = decodeBase64(data.logo.data);
      if (bytes.length === 0) throw new Error("Berkas logo kosong");
      if (bytes.length > MAX_LOGO_BYTES) throw new Error("Ukuran logo maksimal 2 MB");
      if (!admin) throw new Error("Penyimpanan logo tidak tersedia.");
      await ensureLogoBucket(admin);

      const extension = EXTENSION_BY_TYPE[data.logo.contentType] ?? "png";
      const path = `logos/${crypto.randomUUID()}.${extension}`;
      const arrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: data.logo.contentType });
      const { error: uploadError } = await admin.storage
        .from(STORE_LOGO_BUCKET)
        .upload(path, blob, {
          contentType: data.logo.contentType,
          upsert: false,
          cacheControl: "3600",
        });
      if (uploadError) throw new Error("Gagal mengunggah logo: " + uploadError.message);
      logoPath = path;
      uploadedPath = path;
    } else if (data.removeLogo) {
      logoPath = null;
    }

    const { data: saved, error: saveError } = await context.supabase
      .from("store_settings")
      .upsert({
        id: 1,
        name: form.name,
        address: form.address,
        phone: form.phone,
        receipt_header: form.receipt_header,
        receipt_footer: form.receipt_footer,
        logo_path: logoPath,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      if (admin && uploadedPath) {
        await admin.storage.from(STORE_LOGO_BUCKET).remove([uploadedPath]);
      }
      throw new Error("Gagal menyimpan pengaturan toko: " + saveError.message);
    }

    const previousLogo = current?.logo_path ?? null;
    if (admin && previousLogo && previousLogo !== logoPath) {
      await admin.storage.from(STORE_LOGO_BUCKET).remove([previousLogo]);
    }

    return saved;
  });
