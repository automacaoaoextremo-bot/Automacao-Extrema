import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";
import { PrestacaoClient } from "./prestacao-client";

export const dynamic = "force-dynamic";

export default function PrestacaoPage() {
  return (
    <>
      <BazarHeader active="relatorio" />
      <PrestacaoClient />
    </>
  );
}
