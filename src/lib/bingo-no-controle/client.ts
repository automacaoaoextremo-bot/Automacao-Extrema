"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Bingo no Controle: os valores NEXT_PUBLIC_* são incorporados ao bundle no build.
 * A checagem abaixo impede a ligação acidental ao projeto de produção com
 * NEXT_PUBLIC_BNC_ENV=homolog e vice-versa.
 * IMPORTANTE: autorização efetiva é feita pelas políticas RLS do Supabase.
 */
const PROJECTS = {
  homolog: "zbqcngvohidmwqkfwwvf",
  production: "ooegejytfldzkjeexggo",
} as const;

type BncEnvironment = keyof typeof PROJECTS;
let instance: SupabaseClient | null = null;

export function getBncClient(): SupabaseClient | null {
  const env = process.env.NEXT_PUBLIC_BNC_ENV;
  const url = process.env.NEXT_PUBLIC_BNC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_BNC_SUPABASE_ANON_KEY;

  if (env !== "homolog" && env !== "production") return null;
  if (!url || !key) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const expectedHost = `${PROJECTS[env as BncEnvironment]}.supabase.co`;
  if (parsed.protocol !== "https:" || parsed.hostname !== expectedHost) return null;
  if (parsed.username || parsed.password || parsed.port || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;

  if (!instance) {
    instance = createClient(url, key, {
      auth: {
        storageKey: `bnc-tucxa-${env}-v06`,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return instance;
}
