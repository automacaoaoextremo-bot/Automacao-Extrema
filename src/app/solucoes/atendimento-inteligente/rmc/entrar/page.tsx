import type { Metadata } from 'next';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';
import { RmcLoginForm } from '@/components/atendimento-inteligente/rmc-login-form';
export const metadata: Metadata = { title: 'Entrar | Reparos RMC' };
export default function RmcLoginPage() {
  return <div className="min-h-screen bg-[#eff5ef]"><AiBrandHeader backHref="/solucoes/atendimento-inteligente/rmc" />
    <main className="mx-auto max-w-lg px-3 py-3 sm:py-6"><RmcLoginForm /></main></div>;
}
