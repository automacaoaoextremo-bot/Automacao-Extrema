import { AdminGuard } from "@/components/admin-guard";
import AeIntelligentPanel from "@/components/atendimento-inteligente/panel";
export default function ClienteAtendimentoInteligentePage() {
  return <AdminGuard><main className="mx-auto min-h-screen max-w-7xl p-4 sm:p-6"><AeIntelligentPanel /></main></AdminGuard>;
}
