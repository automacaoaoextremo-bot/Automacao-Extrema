"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AeSolutionHeader, type SolutionSectionLink } from "@/components/ae-solution-header";
import { currencyBR, contributionStatusLabel, formatPercent, organizationTypeLabel, type CorrenteClientDashboardPayload } from "@/lib/corrente-em-dia";
import { supabaseBrowser } from "@/lib/supabase-browser";

type DashboardPayload = CorrenteClientDashboardPayload;

const clientSectionLinks: SolutionSectionLink[] = [
  { label: "Painel", href: "#painel" },
  { label: "Acessos", href: "/solucoes/corrente-em-dia/cliente/acessos" },
  { label: "Status", href: "#status" },
  { label: "Organização", href: "#organizacao" },
  { label: "Cliente", href: "#cliente-fundador" },
  { label: "Contribuições", href: "#contribuicoes" },
  { label: "Comprovantes", href: "#comprovantes" },
  { label: "Privacidade e LGPD", href: "#privacidade-lgpd" },
];

function statusBadgeClass(status: string) {
  if (status === "aprovado") return "bg-emerald-100 text-emerald-800";
  if (["comprovante_enviado", "pre_validado"].includes(status)) return "bg-amber-100 text-amber-800";
  if (["divergente", "reprovado"].includes(status)) return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

export default function CorrenteEmDiaClientDashboardPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        window.location.href = "/solucoes/corrente-em-dia/login";
        return;
      }

      const response = await fetch("/api/corrente-em-dia/cliente/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar o painel do cliente.");

      if (isMounted) setPayload(result);
    }

    loadDashboard()
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar painel.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    return (payload?.dashboard ?? []).reduce(
      (acc, item) => {
        acc.expected += Number(item.expected_amount ?? 0);
        acc.approved += Number(item.approved_amount ?? 0);
        acc.pending += Number(item.pending_amount ?? 0);
        acc.review += Number(item.review_count ?? 0);
        acc.divergent += Number(item.divergent_count ?? 0);
        return acc;
      },
      { expected: 0, approved: 0, pending: 0, review: 0, divergent: 0 },
    );
  }, [payload?.dashboard]);

  async function logout() {
    await supabaseBrowser.auth.signOut();
    window.location.href = "/solucoes/corrente-em-dia/login";
  }

  const organization = payload?.organizations?.[0];
  const term = payload?.clientTerms?.[0];
  const roleNames =
    payload?.links
      ?.map((link) => link.role?.name)
      .filter((roleName): roleName is string => Boolean(roleName)) ?? [];
  const accessLabel = payload?.is_manager ? "Acesso de responsável" : "Acesso de contribuinte";
  const accessDescription = payload?.is_manager
    ? "Você visualiza a organização vinculada, contribuições, comprovantes, pendências e condições comerciais configuradas."
    : "Você visualiza somente suas próprias contribuições, comprovantes e histórico, conforme a finalidade autorizada pela organização.";

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Corrente em Dia"
        logoSrc="/corrente-em-dia-logo.svg"
        logoAlt="Logo Corrente em Dia"
        actions={[]}
        sectionLinks={clientSectionLinks}
        topAction={
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#00334E] bg-[#00334E] px-4 py-2 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#064969]"
          >
            Sair
          </button>
        }
      />

      <section id="painel" className="mx-auto max-w-6xl scroll-mt-56 px-4 py-7 lg:py-10">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Painel do cliente</p>
          <h1 className="mt-2 text-4xl font-black leading-tight text-[#00334E]">
            {organization ? organization.name : "Corrente em Dia"}
          </h1>
          <p className="mt-2 text-base leading-7 text-slate-600">
            {payload?.person?.full_name ? `Olá, ${payload.person.full_name}. ` : ""}
            Acompanhe contribuições, comprovantes, pendências e as condições comerciais configuradas.
          </p>
        </div>

        {loading && <div className="mt-6 rounded-3xl bg-white p-5 shadow">Carregando painel...</div>}
        {error && <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 font-bold text-red-700">{error}</div>}

        {payload && !error && (
          <div className="mt-7 space-y-6">
            <section id="acessos" className="scroll-mt-56 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Acessos</p>
              <h2 className="mt-1 text-2xl font-black text-[#00334E]">{accessLabel}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{accessDescription}</p>
              {roleNames.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {roleNames.map((roleName) => (
                    <span key={roleName} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                      {roleName}
                    </span>
                  ))}
                </div>
              )}
              {payload.is_manager && (
                <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                  <p className="font-black">Cadastro de contribuintes</p>
                  <p className="mt-1">
                    Responsáveis podem baixar o modelo de planilha, importar contribuintes e preparar as mensagens de acesso por e-mail ou WhatsApp.
                  </p>
                  <Link
                    href="/solucoes/corrente-em-dia/cliente/acessos"
                    className="mt-3 inline-flex rounded-full bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
                  >
                    Gerenciar acessos
                  </Link>
                </div>
              )}
            </section>

            <section id="status" className="scroll-mt-56">
              <div className="mb-3">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Status</p>
                <h2 className="mt-1 text-2xl font-black text-[#00334E]">Resumo das contribuições</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-5">
                {[
                  ["Previsto", currencyBR(totals.expected)],
                  ["Aprovado", currencyBR(totals.approved)],
                  ["Pendente", currencyBR(totals.pending)],
                  ["Em revisão", String(totals.review)],
                  ["Divergente", String(totals.divergent)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-black text-[#00334E]">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div id="organizacao" className="scroll-mt-56 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Minha organização</p>
                {organization ? (
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <p><strong>Tipo:</strong> {organizationTypeLabel(organization.organization_type)}</p>
                    <p><strong>Cidade/UF:</strong> {organization.city}/{organization.state}</p>
                    <p><strong>WhatsApp:</strong> {organization.whatsapp ?? "não informado"}</p>
                    <p><strong>E-mail:</strong> {organization.email ?? "não informado"}</p>
                    <p><strong>Pix oficial:</strong> {organization.pix_key ?? "não informado"}</p>
                    <p><strong>Recebedor Pix:</strong> {organization.pix_receiver_name ?? organization.name}</p>
                    <p><strong>Valor individual padrão:</strong> {currencyBR(organization.default_individual_amount)}</p>
                    <p><strong>Valor família padrão:</strong> {currencyBR(organization.default_family_amount)}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-slate-600">Nenhuma organização vinculada ao usuário.</p>
                )}
              </div>

              <div id="cliente-fundador" className="scroll-mt-56 rounded-[2rem] bg-[#00334E] p-5 text-white shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Cliente Fundador</p>
                <h2 className="mt-2 text-2xl font-black">Condições comerciais configuráveis</h2>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="rounded-2xl bg-white/10 p-3"><strong>Implantação:</strong> {currencyBR(term?.setup_fee ?? 0)}</div>
                  <div className="rounded-2xl bg-white/10 p-3"><strong>Mensalidade:</strong> {currencyBR(term?.monthly_fee ?? 0)}</div>
                  <div className="rounded-2xl bg-white/10 p-3"><strong>Taxa operacional:</strong> {term?.fee_status === "em_definicao" ? "em definição para lançamento" : formatPercent(term?.operational_fee_percentage ?? 2.5)}</div>
                  <div className="rounded-2xl bg-white/10 p-3"><strong>Prazo do piloto:</strong> {term?.pilot_days ?? 90} dias</div>
                  <div className="rounded-2xl bg-white/10 p-3"><strong>Depoimento:</strong> {term?.allow_testimonial ? "permitido mediante autorização" : "não autorizado"}</div>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/75">
                  Todos os valores, percentuais e benefícios podem ser editados por cliente na gestão da AE antes do lançamento comercial.
                </p>
              </div>
            </section>

            <section id="contribuicoes" className="scroll-mt-56 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Contribuições</p>
                  <h2 className="mt-1 text-2xl font-black text-[#00334E]">Movimentação do mês</h2>
                </div>
                <p className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-800">
                  {payload.is_manager ? "Visão da organização" : "Visão individual"}
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {payload.contributions.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-slate-600">Nenhuma contribuição encontrada para este usuário.</p>}
                {payload.contributions.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black text-slate-800">{item.person?.full_name ?? item.family?.name ?? "Contribuição"}</p>
                        <p className="text-sm text-slate-500">Referência: {item.reference_month} • Vencimento: {item.due_date ?? "livre"}</p>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusBadgeClass(item.status)}`}>
                        {contributionStatusLabel(item.status)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                      <p className="rounded-xl bg-slate-50 p-3"><strong>Valor:</strong> {currencyBR(item.expected_amount)}</p>
                      <p className="rounded-xl bg-slate-50 p-3"><strong>Pix:</strong> {item.pix_key_expected ?? "não informado"}</p>
                      <p className="rounded-xl bg-slate-50 p-3"><strong>Recebedor:</strong> {item.pix_receiver_expected ?? "não informado"}</p>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <button className="rounded-2xl bg-[#31C16B] px-4 py-3 text-sm font-black text-[#00334E] shadow-sm">
                        Copiar Pix
                      </button>
                      <button className="rounded-2xl border border-[#00334E] bg-white px-4 py-3 text-sm font-black text-[#00334E] shadow-sm">
                        Enviar comprovante
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div id="comprovantes" className="scroll-mt-56 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Comprovantes</p>
                <h2 className="mt-1 text-2xl font-black text-[#00334E]">Pré-validação e revisão</h2>
                <div className="mt-4 space-y-3">
                  {payload.receipts.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-slate-600">Nenhum comprovante enviado nos registros exibidos.</p>}
                  {payload.receipts.map((receipt) => (
                    <div key={receipt.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                      <p><strong>Arquivo:</strong> {receipt.file_name ?? "comprovante"}</p>
                      <p><strong>Valor lido:</strong> {currencyBR(receipt.ocr_amount ?? receipt.informed_amount)}</p>
                      <p><strong>Chave lida:</strong> {receipt.ocr_pix_key ?? "não informada"}</p>
                      <p><strong>Status:</strong> {receipt.validation_status}</p>
                      <p className="mt-2 text-slate-600">{receipt.validation_notes}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div id="privacidade-lgpd" className="scroll-mt-56 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Privacidade e LGPD</p>
                <h2 className="mt-1 text-2xl font-black text-[#00334E]">Dados protegidos por finalidade</h2>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  O contribuinte acessa suas próprias contribuições. A organização acessa os dados necessários para gestão, aprovação de comprovantes e prestação de contas interna, conforme consentimento e finalidade definida.
                </p>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
