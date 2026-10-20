import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Shape injected by `requireSupabaseAuth` into server function handlers. */
export type AuthContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

/**
 * Server-side guard used by privileged server functions. It re-reads the
 * caller's role from the database (through RLS, which only exposes their own
 * row) instead of trusting anything sent by the client. This is the second
 * layer on top of the per-table RLS policies.
 */
export async function assertAdmin(context: AuthContext): Promise<void> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) throw new Error("Gagal memeriksa hak akses.");
  if (!data || data.role !== "admin") {
    throw new Error("Akses ditolak: hanya Admin yang diizinkan.");
  }
}
