import { createSupabaseAdminClient } from "@/lib/impacto-no-controle/supabase/admin";

export async function requireAdminFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("AUTH_REQUIRED");

  const supabase = createSupabaseAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) throw new Error("AUTH_INVALID");

  const { data: appUser, error: appUserError } = await supabase
    .from("inc_app_users")
    .select("id, role, client_id, email, name")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (appUserError || !appUser) throw new Error("NO_APP_USER");
  return { supabase, user: userData.user, appUser };
}
