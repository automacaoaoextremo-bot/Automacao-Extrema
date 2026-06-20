import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";
import { CaixaClient } from "./caixa-client";

export const dynamic = "force-dynamic";

export default function CaixaPage() {
  return (
    <>
      <BazarHeader active="caixa" />
      <CaixaClient />
    </>
  );
}
