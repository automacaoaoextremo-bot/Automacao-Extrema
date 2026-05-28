import { supabaseBrowser } from "@/lib/supabase-browser";

export async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erro na requisição.");
  }

  return result as T;
}
