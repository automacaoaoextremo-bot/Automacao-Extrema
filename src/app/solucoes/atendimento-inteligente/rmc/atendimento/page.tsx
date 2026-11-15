import type { Metadata } from 'next';
import { AiOperatorGuard } from '@/components/atendimento-inteligente/operator-guard';
import { RmcDashboard } from '@/components/atendimento-inteligente/rmc-dashboard';

export const metadata: Metadata = { title: 'Atendimento | Reparos RMC', robots: { index: false, follow: false } };

export default function RmcAtendimentoPage() {
  return <AiOperatorGuard><main className="min-h-screen bg-[#eff5ef] p-3 sm:p-6"><RmcDashboard /></main></AiOperatorGuard>;
}
