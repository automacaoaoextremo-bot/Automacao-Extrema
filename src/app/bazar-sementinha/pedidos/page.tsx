import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";
import { PedidosClient } from "./pedidos-client";

export const dynamic = "force-dynamic";

export default function PedidosPage() {
  return (
    <>
      <BazarHeader active="pedidos" />
      <PedidosClient />
    </>
  );
}
