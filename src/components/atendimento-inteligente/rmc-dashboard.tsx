'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
import { AiRequestQueue } from './request-queue';
import { RmcOperations, type RmcCatalogKind } from './rmc-operations';
import { RmcReviewDrafts } from './rmc-review-drafts';

const base = '/solucoes/atendimento-inteligente/rmc';
type Section = 'home' | 'requests' | 'review' | 'service' | 'address' | 'vehicle' | 'material' | 'tool' | 'supplier' | 'contract';
type Screen = { section: Section; filter?: string };
type Organization = { id: string; slug: string; current_user_role: 'owner' | 'operator' | 'admin' | null };
const n2Items: { section: Section; title: string; subtitle: string }[] = [
  { section: 'requests', title: 'Solicitações', subtitle: 'Pedidos, análises e orçamentos' },
  { section: 'service', title: 'Serviços e custos', subtitle: 'Mão de obra e referências' },
  { section: 'material', title: 'Materiais', subtitle: 'Quantidades e preços' },
  { section: 'tool', title: 'Ferramentas', subtitle: 'Recursos por serviço' },
  { section: 'address', title: 'Endereços RMC', subtitle: 'Origens e deslocamentos' },
  { section: 'vehicle', title: 'Veículos', subtitle: 'Consumo e custo por km' },
  { section: 'supplier', title: 'Fornecedores', subtitle: 'Referências de compra' },
  { section: 'contract', title: 'Contratos', subtitle: 'Manutenções recorrentes' },
  { section: 'review', title: 'Revisão WhatsApp', subtitle: 'Rascunhos sujeitos a aprovação' },
];
const screenNames: Record<Section, string> = {
  home: 'Início', requests: 'Solicitações', review: 'Revisão WhatsApp',
  service: 'Serviços e custos', address: 'Endereços RMC', vehicle: 'Veículos',
  material: 'Materiais', tool: 'Ferramentas', supplier: 'Fornecedores', contract: 'Contratos',
};

export function RmcDashboard() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [name, setName] = useState('');
  const [screen, setScreen] = useState<Screen>({ section: 'home' });
  const [history, setHistory] = useState<Screen[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const canManageN2 = organization?.current_user_role === 'owner' || organization?.current_user_role === 'admin';

  useEffect(() => {
    let alive = true;
    async function initialize() {
      const [orgs, actor] = await Promise.all([
        adminFetch<{ organizations: Organization[] }>('/api/atendimento-inteligente/organizations'),
        adminFetch<{ name: string }>('/api/atendimento-inteligente/actor'),
      ]);
      const org = orgs.organizations.find((item) => item.slug === 'reparos-rmc');
      if (!org) throw new Error('Sua conta não está autorizada para a Reparos RMC.');
      if (alive) {
        setOrganization(org);
        setName(actor.name);
      }
    }
    void initialize().catch((cause: unknown) => {
      if (alive) setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a RMC.');
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  function open(next: Screen) {
    setHistory((prev) => [...prev, screen]);
    setScreen(next);
  }
  function close() {
    const previous = history[history.length - 1] ?? { section: 'home' as const };
    setHistory((prev) => prev.slice(0, -1));
    setScreen(previous);
  }

  const firstName = name.trim().toLocaleLowerCase('pt-BR') === 'automação extrema' ? 'Automação Extrema' : (name.trim().split(/\s+/)[0] || (canManageN2 ? 'Anderson' : 'equipe'));
  return <div className="mx-auto w-full max-w-5xl space-y-2 text-[#272423] sm:space-y-3">
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading && <p role="status" className="rounded-xl bg-white p-4 text-sm">Carregando painel RMC...</p>}
    {organization && screen.section === 'home' && <>
      <section className="rounded-3xl border-l-[6px] border-[#f28a20] bg-[#242122] p-4 text-white shadow-sm sm:p-6">
        {!canManageN2 && <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ffba70]">Reparos RMC · N1</p>}
        <h1 className={`${canManageN2 ? 'mt-0' : 'mt-2'} text-2xl font-black leading-snug sm:text-3xl`}>Olá, {firstName}!</h1>
        <p className="mt-1 text-sm text-[#f6eee7]">{canManageN2
          ? 'Acompanhe as solicitações, prepare orçamentos e organize a operação da Reparos RMC.'
          : 'Cadastre clientes, registre novos pedidos e acompanhe os atendimentos.'}</p>
      </section>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3" aria-label="Acessos RMC">
        {!canManageN2 && <>
          <Link href={`${base}/cadastro`} className="rounded-2xl border bg-white p-4 shadow-sm hover:border-[#f28a20]"><span className="block font-bold">Cadastrar cliente</span><span className="mt-1 block text-xs text-slate-600">Novo cadastro assistido</span><span className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-[#a14c04]">Toque para abrir</span></Link>
          <Link href={`${base}/solicitar`} className="rounded-2xl border bg-white p-4 shadow-sm hover:border-[#f28a20]"><span className="block font-bold">Registrar pedido</span><span className="mt-1 block text-xs text-slate-600">Solicitação em nome do cliente</span><span className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-[#a14c04]">Toque para abrir</span></Link>
          <button type="button" onClick={() => open({ section: 'requests' })} className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-[#f28a20]"><span className="block font-bold">Acompanhar pedidos</span><span className="mt-1 block text-xs text-slate-600">Consultar solicitações</span><span className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-[#a14c04]">Toque para abrir</span></button>
        </>}
        {canManageN2 && n2Items.map((item) => <button type="button" key={item.section}
          onClick={() => open({ section: item.section })}
          className="rounded-2xl border bg-white p-3 text-left shadow-sm hover:border-[#f28a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e87912] sm:p-4">
          <span className="block font-bold">{item.title}</span>
          <span className="mt-1 block text-xs text-slate-600">{item.subtitle}</span>
          </button>)}
      </div>
    </>}
    {organization && screen.section !== 'home' && <>
      {screen.section === 'requests' && <AiRequestQueue key={`${organization.id}-${screen.filter ?? 'all'}`} organizationId={organization.id} organizationSlug="reparos-rmc" canManageN2={canManageN2} initialStatusFilter={screen.filter ?? 'all'} onClose={close} />}
      {screen.section === 'review' && canManageN2 && <>
        <header className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
          <h1 className="text-lg font-black">{screenNames[screen.section]}</h1>
          <button type="button" onClick={close} className="rounded-xl bg-[#242122] px-4 py-2 text-sm font-bold text-white">Fechar</button>
        </header>
        <RmcReviewDrafts />
      </>}
      {['service', 'address', 'vehicle', 'material', 'tool', 'supplier', 'contract'].includes(screen.section) && canManageN2 &&
        <RmcOperations key={screen.section} focusedKind={screen.section as RmcCatalogKind} onClose={close} />}
    </>}
  </div>;
}
