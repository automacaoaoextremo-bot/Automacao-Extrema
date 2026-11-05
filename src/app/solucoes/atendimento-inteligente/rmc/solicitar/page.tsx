import type { Metadata } from 'next';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';
import { AiRequestForm } from '@/components/atendimento-inteligente/request-form';
export const metadata: Metadata = { title: 'Solicitar serviço | Reparos RMC' };
export default function RmcRequestPage() { return <div className="min-h-screen bg-[#eff3f6]"><AiBrandHeader /><main className="mx-auto max-w-2xl px-3 py-5"><AiRequestForm initialOrg="reparos-rmc" fixedOrg /><p className="mt-4 text-center text-xs text-slate-600">Nesta fase o registro é assistido por operador autorizado. Os dados são utilizados para avaliar o serviço e retornar ao cliente.</p></main></div>; }
