import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Role = Database["public"]["Enums"]["app_role"];

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  kasir: "Kasir",
};

export type Profile = {
  userId: string;
  username: string;
  role: Role;
};

/**
 * Accounts are identified by a username only. Supabase Auth requires an email,
 * so every username maps to a deterministic, internal-only address. No mail is
 * ever sent to it (email confirmation is forced at creation and public signup is
 * disabled), so it is never a real mailbox.
 */
export const USERNAME_EMAIL_DOMAIN = "countsales.local";

/** Mirrors the `user_accounts.username` CHECK constraint in migration 0003. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export const USERNAME_HINT =
  "3–32 karakter, huruf kecil/angka, boleh titik, garis bawah, atau strip.";

export const PASSWORD_HINT =
  "Minimal 8 karakter dan mengandung huruf serta angka. Sebaiknya tambahkan huruf besar dan simbol.";

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${USERNAME_EMAIL_DOMAIN}`;
}

/** Returns an error message (Indonesian) or null when the username is valid. */
export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value);
  if (!username) return "Nama pengguna wajib diisi";
  if (!USERNAME_PATTERN.test(username)) return `Nama pengguna tidak valid. ${USERNAME_HINT}`;
  return null;
}

/** Returns an error message (Indonesian) or null when the password is valid. */
export function validatePassword(value: string): string | null {
  if (!value) return "Kata sandi wajib diisi";
  if (value.length < 8) return "Kata sandi minimal 8 karakter";
  if (value.length > 72) return "Kata sandi maksimal 72 karakter";
  if (!/[A-Za-z]/.test(value)) return "Kata sandi harus mengandung huruf";
  if (!/[0-9]/.test(value)) return "Kata sandi harus mengandung angka";
  return null;
}

export function passwordsMatch(password: string, confirm: string): string | null {
  if (password !== confirm) return "Konfirmasi kata sandi tidak sama";
  return null;
}

/** Reads the username + role of a signed-in user. Requires RLS to allow the own row. */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const [account, role] = await Promise.all([
    supabase.from("user_accounts").select("username").eq("user_id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
  ]);
  if (account.error) throw account.error;
  if (role.error) throw role.error;
  if (!account.data || !role.data) return null;
  return { userId, username: account.data.username, role: role.data.role };
}

const INVALID_CREDENTIALS = "Nama pengguna atau kata sandi salah.";

/** Signs in with a username + password. Passwords are verified by Supabase Auth (bcrypt). */
export async function signIn(username: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (!error) return;
  if (error.status === 429) {
    throw new Error("Terlalu banyak percobaan masuk. Coba lagi beberapa saat lagi.");
  }
  throw new Error(INVALID_CREDENTIALS);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error && error.status !== 403 && error.status !== 401) throw error;
}

/** Short label used in the UI, e.g. the sidebar account box. */
export function accountLabel(profile: Profile | null): string {
  if (!profile) return "Pengguna";
  return `${profile.username} · ${roleLabels[profile.role]}`;
}
