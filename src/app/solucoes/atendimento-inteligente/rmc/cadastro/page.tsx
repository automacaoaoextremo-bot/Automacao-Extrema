import type { Metadata } from 'next';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';
import { RmcRegistrationGate } from '@/components/atendimento-inteligente/rmc-registration-gate';
export const metadata: Metadata = { title: 'Cadastro | Reparos RMC' };
export default function RmcCadastroPage(){
 return <div className="min-h-screen bg-[#eff5ef]"><AiBrandHeader backHref="/solucoes/atendimento-inteligente/rmc/entrar"/>
  <main className="mx-auto max-w-lg px-3 py-5"><RmcRegistrationGate/></main></div>;
}
