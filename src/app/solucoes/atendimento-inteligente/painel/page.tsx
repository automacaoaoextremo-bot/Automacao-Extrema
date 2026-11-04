import { AiOperatorGuard } from '@/components/atendimento-inteligente/operator-guard';
import AeIntelligentPanel from '@/components/atendimento-inteligente/panel';

export default function ClienteAtendimentoInteligentePage() {
  return <AiOperatorGuard><main className="mx-auto min-h-screen max-w-7xl bg-[#f5f8f8] p-4 sm:p-6"><AeIntelligentPanel/></main></AiOperatorGuard>;
}
