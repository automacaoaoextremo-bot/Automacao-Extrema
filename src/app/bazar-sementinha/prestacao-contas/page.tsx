import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";
import { PrestacaoClient } from "./prestacao-client";

export const dynamic = "force-dynamic";

type PrestacaoPageProps = {
  searchParams?: Promise<{ evento?: string }>;
};

export default async function PrestacaoPage({ searchParams }: PrestacaoPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const eventSelector = typeof resolved.evento === "string" ? resolved.evento : "";
  return (
    <>
      <BazarHeader active="relatorio" />
      <PrestacaoClient eventSelector={eventSelector} />
    </>
  );
}
