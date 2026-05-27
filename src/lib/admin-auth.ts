import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function requireAdminUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!token) {
    return {
      user: null,
      error: NextResponse.json({ error: "Acesso não autenticado." }, { status: 401 }),
    };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 }),
    };
  }

  return { user: data.user, error: null };
}
