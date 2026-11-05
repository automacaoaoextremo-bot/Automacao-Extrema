import type { Metadata } from 'next';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';
import { AiRequestForm } from '@/components/atendimento-inteligente/request-form';
export const metadata:Metadata={title:'Solicitar serviço | Reparos RMC'};
export default function RmcRequestPage(){return <div className="min-h-screen bg-[#eff4f5]"><AiBrandHeader backHref="/solucoes/atendimento-inteligente/rmc"/><main className="mx-auto max-w-2xl px-3 py-4"><AiRequestForm initialOrg="reparos-rmc" fixedOrg/></main></div>;}
