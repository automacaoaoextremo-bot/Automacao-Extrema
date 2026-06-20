import { redirect } from "next/navigation";
import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";
import { getSessionToken, verifySession } from "@/lib/bazar-sementinha";
import { GestaoClient } from "./gestao-client";

export const dynamic = "force-dynamic";

export default async function GestaoPage() {
  const token = await getSessionToken();
  if (!verifySession(token)) redirect("/bazar-sementinha/login");
  return (
    <>
      <BazarHeader active="gestao" logged />
      <GestaoClient />
    </>
  );
}
