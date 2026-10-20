import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  normalizeUsername,
  usernameToEmail,
  validatePassword,
  validateUsername,
  type Role,
} from "@/lib/auth";
import { assertAdmin } from "@/api/guard";

type Input = Record<string, unknown>;

function asRecord(input: unknown): Input {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Data tidak valid.");
  }
  return input as Input;
}

function readString(input: Input, key: string): string {
  const value = input[key];
  if (typeof value !== "string") throw new Error("Data tidak valid.");
  return value;
}

function readRole(input: Input): Role {
  const value = input["role"];
  if (value !== "admin" && value !== "kasir") throw new Error("Peran tidak valid.");
  return value;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readUuid(input: Input, key: string): string {
  const value = readString(input, key);
  if (!UUID_PATTERN.test(value)) throw new Error("Data tidak valid.");
  return value;
}

function parseCredentials(input: unknown, requireConfirm: boolean) {
  const data = asRecord(input);
  const username = normalizeUsername(readString(data, "username"));
  const usernameError = validateUsername(username);
  if (usernameError) throw new Error(usernameError);
  const password = readString(data, "password");
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);
  if (requireConfirm && password !== readString(data, "confirm")) {
    throw new Error("Konfirmasi kata sandi tidak sama");
  }
  return { username, password };
}

function authErrorMessage(error: { message?: string } | null): string {
  const message = error?.message ?? "";
  if (/already|registered|exists/i.test(message)) return "Nama pengguna sudah digunakan.";
  if (/password/i.test(message)) return "Kata sandi tidak memenuhi syarat.";
  return "Gagal menyimpan akun pengguna.";
}

/** Removes a half-created account so a failed creation never leaves an orphan login. */
async function rollbackUser(admin: SupabaseClient<Database>, userId: string): Promise<void> {
  await admin.auth.admin.deleteUser(userId);
  await admin.from("user_accounts").delete().eq("user_id", userId);
}

/**
 * Public: tells the login screen whether the first Admin still has to be
 * created. Only a boolean is exposed, never account data. Prefers the public
 * `app_setup_required()` function so it also works without the service-role key.
 */
export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.rpc("app_setup_required");
    if (!error && typeof data === "boolean") return { needsSetup: data };
  } catch {
    // Fall through to the service-role check below.
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_accounts")
    .select("user_id", { count: "exact", head: true });
  if (error) throw new Error("Gagal memeriksa status penyiapan aplikasi.");
  return { needsSetup: (count ?? 0) === 0 };
});

/**
 * Public bootstrap: creates the very first Admin. Refuses to run once any
 * account exists, so it cannot be used to escalate privileges later. Uses the
 * service-role key because public signup is disabled on the project.
 */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseCredentials(input, true))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("user_accounts")
      .select("user_id", { count: "exact", head: true });
    if (countError) throw new Error("Gagal memeriksa status penyiapan aplikasi.");
    if ((count ?? 0) > 0) throw new Error("Aplikasi sudah memiliki akun. Silakan masuk.");

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username },
    });
    if (createError || !created.user) throw new Error(authErrorMessage(createError));

    const userId = created.user.id;
    const { error: accountError } = await supabaseAdmin
      .from("user_accounts")
      .insert({ user_id: userId, username: data.username });
    if (accountError) {
      await rollbackUser(supabaseAdmin, userId);
      throw new Error("Nama pengguna sudah digunakan.");
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleError) {
      await rollbackUser(supabaseAdmin, userId);
      throw new Error("Gagal menetapkan hak akses Admin.");
    }

    return { userId, username: data.username };
  });

/** Admin: creates a Cashier or Admin account. */
export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const role = readRole(asRecord(input));
    const credentials = parseCredentials(input, false);
    return { username: credentials.username, password: credentials.password, role };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("user_accounts")
      .select("user_id")
      .eq("username", data.username)
      .maybeSingle();
    if (existing) throw new Error("Nama pengguna sudah digunakan.");

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username },
    });
    if (createError || !created.user) throw new Error(authErrorMessage(createError));

    const userId = created.user.id;
    const { error: accountError } = await supabaseAdmin
      .from("user_accounts")
      .insert({ user_id: userId, username: data.username });
    if (accountError) {
      await rollbackUser(supabaseAdmin, userId);
      throw new Error("Nama pengguna sudah digunakan.");
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (roleError) {
      await rollbackUser(supabaseAdmin, userId);
      throw new Error("Gagal menetapkan hak akses.");
    }

    return { userId, username: data.username, role: data.role };
  });

/** Admin: lists every account with its role. */
export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [accounts, roles] = await Promise.all([
      supabaseAdmin
        .from("user_accounts")
        .select("user_id, username, created_at")
        .order("created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (accounts.error) throw new Error("Gagal memuat daftar pengguna.");
    if (roles.error) throw new Error("Gagal memuat hak akses pengguna.");

    const roleByUser = new Map(roles.data.map((row) => [row.user_id, row.role]));
    return accounts.data.map((row) => ({
      userId: row.user_id,
      username: row.username,
      role: roleByUser.get(row.user_id) ?? null,
      createdAt: row.created_at,
      isSelf: row.user_id === context.userId,
    }));
  });

/** Admin: changes a role. The database function also blocks self-demotion. */
export const setAccountRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const data = asRecord(input);
    return { userId: readUuid(data, "userId"), role: readRole(data) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("admin_set_role", {
      _user_id: data.userId,
      _role: data.role,
    });
    if (error) throw new Error(error.message || "Gagal mengubah hak akses.");
    return { ok: true };
  });

/** Admin: resets another account's password. Passwords are hashed by Supabase Auth. */
export const resetAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const data = asRecord(input);
    const password = readString(data, "password");
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);
    return { userId: readUuid(data, "userId"), password };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(authErrorMessage(error));
    return { ok: true };
  });

/** Admin: deletes an account (blocked for the account in use). */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ({ userId: readUuid(asRecord(input), "userId") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("Tidak dapat menghapus akun yang sedang digunakan.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await rollbackUser(supabaseAdmin, data.userId);
    return { ok: true };
  });
