import { supabaseAdmin } from "@/lib/supabase-admin";

export type AeScope = { userId: string; platformAdmin: boolean; organizationIds: string[] };

export async function aeScope(request: Request): Promise<AeScope | null> {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const jwt = auth.slice(7).trim();
  if (!jwt) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(jwt);
  if (error || !data.user) return null;
  const userId = data.user.id;
  const { data: admin, error: adminError } = await supabaseAdmin
    .from("ae_ai_platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (adminError) throw adminError;
  const { data: rows, error: memberError } = await supabaseAdmin
    .from("ae_ai_memberships").select("organization_id").eq("user_id", userId);
  if (memberError) throw memberError;
  return { userId, platformAdmin: Boolean(admin), organizationIds: (rows ?? []).map((r) => r.organization_id) };
}

export function allowed(scope: AeScope, organizationId: string) {
  return scope.platformAdmin || scope.organizationIds.includes(organizationId);
}

export function isUuid(x: unknown): x is string {
  return typeof x === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
}

export function safeError(error: unknown): string {
  // Nunca enviar detalhes internos, tokens ou dados de terceiros ao cliente.
  console.error("AE Atendimento Inteligente: falha de processamento", error instanceof Error ? error.name : "unknown");
  return "Nao foi possivel completar a operacao.";
}
