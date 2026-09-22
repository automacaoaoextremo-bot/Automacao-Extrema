import { supabaseAdmin } from "@/lib/supabase-admin";

export function createSupabaseAdminClient() {
  return supabaseAdmin;
}
