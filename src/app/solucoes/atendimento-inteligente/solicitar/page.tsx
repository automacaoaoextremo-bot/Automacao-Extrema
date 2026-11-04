import type { Metadata } from 'next';
import Link from 'next/link';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';
import { AiRequestForm } from '@/components/atendimento-inteligente/request-form';

export const metadata: Metadata = { title: 'Solicitar serviço | Reparos RMC', description: 'Registre sua solicitação de manutenção ou reparo para avaliação humana.' };
type P = { searchParams: Promise<{ empresa?: string }> };
export default async function RequestPage({ searchParams }: P) {
  const params = await searchParams;
  const org = params.empresa === 'piloto-automotivo' ? 'piloto-automotivo' as const : 'reparos-rmc' as const;
  return <div className="min-h-screen bg-[#f5f8f8] text-[#16384b]">
    <AiBrandHeader />
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#b48139]">Atendimento Inteligente • Solicitações</p>
      <AiRequestForm initialOrg={org}/>
      <p className="mt-5 text-center text-sm text-slate-600">Prefere falar diretamente? <a className="font-bold underline" href="https://wa.me/5519981851045" target="_blank" rel="noopener noreferrer">WhatsApp da Reparos RMC</a></p>
      <p className="mt-2 text-center text-xs"><Link className="underline" href="/solucoes/atendimento-inteligente/entrar">Acesso da equipe</Link></p>
    </main>
  </div>;
}
