import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";
import { PedidosClient } from "./pedidos-client";

export const dynamic = "force-dynamic";

type PedidosPageProps = {
  searchParams?: Promise<{ cliente?: string }>;
};

export default async function PedidosPage({ searchParams }: PedidosPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const publicContextToken = typeof resolvedSearchParams.cliente === "string" ? resolvedSearchParams.cliente : "";

  return (
    <>
      <BazarHeader active="pedidos" publicView={Boolean(publicContextToken)} publicContextToken={publicContextToken} />
      <PedidosClient />
    </>
  );
}
