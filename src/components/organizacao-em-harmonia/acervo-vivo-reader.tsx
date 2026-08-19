"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

type TitleRow = {
  id: string;
  title: string;
  subtitle?: string | null;
  authors?: string[] | null;
  publisher?: string | null;
  publication_year?: number | null;
  description?: string | null;
  subjects?: string[] | null;
  cover_url?: string | null;
  totalCopies?: number;
  availableCopies?: number;
};

type LoanRow = {
  id: string;
  copy_id: string;
  due_at: string;
  returned_at?: string | null;
  status: string;
  renewed_count?: number;
};

type ReservationRow = {
  id: string;
  title_id: string;
  status: string;
  requested_at: string;
  hold_until?: string | null;
};

type ResourceRow = {
  id: string;
  resource_type: string;
  title: string;
  description?: string | null;
  governance_status?: string;
};

type ResourceVersion = {
  id: string;
  resource_id: string;
  version_label: string;
  source_url?: string | null;
  storage_path?: string | null;
  is_current: boolean;
};

type Trail = {
  id: string;
  name: string;
  objective?: string | null;
  description?: string | null;
  official?: boolean;
  level?: string;
};

type TrailItem = {
  id: string;
  trail_id: string;
  item_type: "title" | "resource";
  title_id?: string | null;
  resource_id?: string | null;
  required?: boolean;
  note?: string | null;
};

type Curation = {
  id: string;
  curation_type: string;
  title: string;
  description?: string | null;
  title_id?: string | null;
  resource_id?: string | null;
  starts_at?: string | null;
};

type Payload = {
  reader?: { personName?: string; profile?: string };
  settings?: {
    loan_days?: number;
    daily_late_fee?: number;
    renewal_limit?: number;
    member_reservations_enabled?: boolean;
    member_renewals_enabled?: boolean;
  };
  titles?: TitleRow[];
  trails?: Trail[];
  trailItems?: TrailItem[];
  resources?: ResourceRow[];
  resourceVersions?: ResourceVersion[];
  curations?: Curation[];
  myLoans?: LoanRow[];
  myReservations?: ReservationRow[];
};

type Props = {
  api: string;
  backHref: string;
  homeHref: string;
  header: ReactNode;
  audienceLabel: string;
};

type View = "descobrir" | "trilhas" | "meus";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function typeLabel(value: string) {
  const labels: Record<string, string> = {
    regulamento: "Regulamento",
    procedimento: "Procedimento",
    manual: "Manual",
    folha_verde: "Folha Verde",
    apostila: "Apostila",
    video: "Vídeo",
    podcast: "Podcast",
    audio: "Áudio",
    memoria_da_casa: "Memória da Casa",
    outro: "Conteúdo",
  };
  return labels[value] ?? value;
}

function Cover({ title }: { title: TitleRow }) {
  if (title.cover_url) {
    return (
      <div
        role="img"
        aria-label={`Capa de ${title.title}`}
        className="h-36 w-24 shrink-0 rounded-xl bg-cover bg-center shadow ring-1 ring-black/10 sm:h-40 sm:w-28"
        style={{ backgroundImage: `url(${title.cover_url})` }}
      />
    );
  }
  return (
    <div className="flex h-36 w-24 shrink-0 items-center justify-center rounded-xl bg-[#E6EFE3] p-3 text-center text-xs font-black leading-4 text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:h-40 sm:w-28">
      {title.title}
    </div>
  );
}

export function AcervoVivoReader({ api, backHref, homeHref, header, audienceLabel }: Props) {
  const [payload, setPayload] = useState<Payload>({});
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("descobrir");
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [selectedTrailId, setSelectedTrailId] = useState("");

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch(api, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const next = (await response.json().catch(() => ({}))) as Payload & { error?: string };
    if (!response.ok) throw new Error(next.error || "Não foi possível carregar o Acervo Vivo.");
    setPayload(next);
  }, [api]);

  useEffect(() => {
    let active = true;
    void supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!active) return;
      if (!accessToken) {
        setError("Sua sessão expirou. Entre novamente para acessar o Acervo Vivo.");
        setLoading(false);
        return;
      }
      setToken(accessToken);
      try {
        await load(accessToken);
      } catch (currentError) {
        if (active) setError(currentError instanceof Error ? currentError.message : "Erro ao carregar o Acervo Vivo.");
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [load]);

  const titles = useMemo(() => payload.titles ?? [], [payload.titles]);
  const trails = useMemo(() => payload.trails ?? [], [payload.trails]);
  const trailItems = useMemo(() => payload.trailItems ?? [], [payload.trailItems]);
  const resources = useMemo(() => payload.resources ?? [], [payload.resources]);
  const versions = useMemo(() => payload.resourceVersions ?? [], [payload.resourceVersions]);
  const curations = useMemo(() => payload.curations ?? [], [payload.curations]);
  const loans = useMemo(() => payload.myLoans ?? [], [payload.myLoans]);
  const reservations = useMemo(() => payload.myReservations ?? [], [payload.myReservations]);
  const titleMap = useMemo(() => new Map(titles.map((item) => [item.id, item])), [titles]);
  const resourceMap = useMemo(() => new Map(resources.map((item) => [item.id, item])), [resources]);

  const filteredTitles = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return titles;
    return titles.filter((item) => normalize([
      item.title,
      item.subtitle || "",
      ...(item.authors ?? []),
      ...(item.subjects ?? []),
    ].join(" ")).includes(needle));
  }, [query, titles]);

  const spotlight = useMemo(() => {
    const prioritized = curations.find((item) => item.curation_type === "clube_do_livro" && item.title_id)
      ?? curations.find((item) => item.curation_type === "destaque" && item.title_id);
    return prioritized?.title_id ? titleMap.get(prioritized.title_id) ?? null : titles[0] ?? null;
  }, [curations, titleMap, titles]);

  const activeLoans = useMemo(() => loans.filter((item) => !item.returned_at && ["ativo", "atrasado"].includes(item.status)), [loans]);
  const activeReservations = useMemo(() => reservations.filter((item) => ["aguardando", "disponivel"].includes(item.status)), [reservations]);
  const selectedTitle = selectedTitleId ? titleMap.get(selectedTitleId) ?? null : null;
  const selectedTrail = selectedTrailId ? trails.find((item) => item.id === selectedTrailId) ?? null : null;

  async function run(body: Record<string, unknown>, message: string) {
    if (!token || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
      setSuccess(message);
      await load(token);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao concluir a operação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      {header}

      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#CFE2C7] sm:text-xs">Acervo Vivo • {audienceLabel}</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">O que você quer estudar hoje?</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
            Encontre livros, materiais da Casa e trilhas que ajudam a transformar uma dúvida em próximo passo de estudo — sem criar outro cadastro para quem já está na Base Única do Tucxa.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={homeHref} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C]">Início</Link>
            <Link href={backHref} className="rounded-xl bg-[#D9E8D6] px-3 py-2 text-xs font-black text-[#123D2C]">Voltar</Link>
          </div>
        </section>

        {(error || success) && (
          <div className={`mt-3 rounded-2xl p-4 text-sm font-bold ring-1 ${error ? "bg-red-50 text-red-800 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"}`}>
            {error || success}
          </div>
        )}

        <nav className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-white p-2 shadow ring-1 ring-[#123D2C]/10">
          {([
            ["descobrir", "Descobrir"],
            ["trilhas", "Trilhas"],
            ["meus", `Meus (${activeLoans.length})`],
          ] as Array<[View, string]>).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setView(value)} className={`rounded-xl px-2 py-2.5 text-xs font-black sm:text-sm ${view === value ? "bg-[#123D2C] text-white" : "bg-[#F4F8F1] text-[#123D2C]"}`}>
              {label}
            </button>
          ))}
        </nav>

        {loading ? (
          <p className="mt-4 rounded-3xl bg-white p-5 font-bold text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Carregando o Acervo Vivo...</p>
        ) : view === "descobrir" ? (
          <div className="mt-4 grid gap-4">
            <section className="rounded-3xl bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
              <label className="grid gap-2 text-sm font-black text-[#123D2C]">
                Buscar por título, autor ou tema
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-[#F9FBF7] px-4 py-3 text-base font-semibold outline-none focus:border-[#2F6B43]" placeholder="Ex.: mediunidade, Umbanda, cambono..." />
              </label>
            </section>

            {spotlight && (
              <section className="rounded-3xl bg-[#E7F0E2] p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">Em destaque</p>
                <div className="mt-3 flex gap-4">
                  <Cover title={spotlight} />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-black leading-tight text-[#123D2C]">{spotlight.title}</h2>
                    {(spotlight.authors ?? []).length > 0 && <p className="mt-1 text-sm font-bold text-slate-600">{spotlight.authors?.join(", ")}</p>}
                    <p className="mt-3 text-sm font-semibold text-slate-700">{spotlight.availableCopies ? `${spotlight.availableCopies} exemplar(es) disponível(is)` : "Reserve para entrar na fila de leitura."}</p>
                    <button type="button" onClick={() => setSelectedTitleId(spotlight.id)} className="mt-3 rounded-xl bg-[#123D2C] px-4 py-2.5 text-sm font-black text-white">Conhecer</button>
                  </div>
                </div>
              </section>
            )}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTitles.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedTitleId(item.id)} className="flex min-h-44 gap-3 rounded-3xl bg-white p-4 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <Cover title={item} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-black leading-tight text-[#123D2C]">{item.title}</span>
                    {(item.authors ?? []).length > 0 && <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">{item.authors?.join(", ")}</span>}
                    <span className={`mt-3 inline-flex rounded-full px-2 py-1 text-[10px] font-black ${item.availableCopies ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{item.availableCopies ? `${item.availableCopies} disponível(is)` : "Reservar"}</span>
                  </span>
                </button>
              ))}
              {filteredTitles.length === 0 && <p className="rounded-3xl bg-white p-5 text-sm font-semibold text-slate-500 shadow ring-1 ring-slate-100 sm:col-span-2 xl:col-span-3">Nenhum título encontrado. Tente outro tema ou palavra-chave.</p>}
            </section>
          </div>
        ) : view === "trilhas" ? (
          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            {trails.map((trail) => {
              const count = trailItems.filter((item) => item.trail_id === trail.id).length;
              return (
                <button key={trail.id} type="button" onClick={() => setSelectedTrailId(trail.id)} className="rounded-3xl bg-white p-5 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">{trail.official ? "Trilha oficial" : "Trilha em validação"}</p>
                  <h2 className="mt-2 text-xl font-black text-[#123D2C]">{trail.name}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{trail.objective || trail.description || "Sequência de conteúdos para apoiar seu estudo."}</p>
                  <p className="mt-3 text-xs font-black text-[#2F6B43]">{count} item(ns) na trilha • TOQUE PARA ABRIR</p>
                </button>
              );
            })}
          </section>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Meus empréstimos</p>
              <div className="mt-3 grid gap-2">
                {activeLoans.map((loan) => (
                  <article key={loan.id} className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                    <p className="font-black text-[#123D2C]">Empréstimo ativo</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">Devolver até {formatDate(loan.due_at)} • {loan.renewed_count ?? 0} renovação(ões)</p>
                    {payload.settings?.member_renewals_enabled !== false && (
                      <button disabled={saving} type="button" onClick={() => void run({ action: "renew", loanId: loan.id }, "Empréstimo renovado.")} className="mt-3 rounded-xl bg-[#123D2C] px-4 py-2 text-xs font-black text-white disabled:opacity-50">Solicitar renovação</button>
                    )}
                  </article>
                ))}
                {activeLoans.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Você não possui empréstimos ativos.</p>}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Minhas reservas</p>
              <div className="mt-3 grid gap-2">
                {activeReservations.map((reservation) => (
                  <article key={reservation.id} className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                    <p className="font-black text-[#123D2C]">{titleMap.get(reservation.title_id)?.title || "Livro reservado"}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{reservation.status === "disponivel" ? `Disponível para retirada${reservation.hold_until ? ` até ${formatDate(reservation.hold_until)}` : ""}.` : `Na fila desde ${formatDate(reservation.requested_at)}.`}</p>
                    <button disabled={saving} type="button" onClick={() => void run({ action: "cancel-reservation", reservationId: reservation.id }, "Reserva cancelada.")} className="mt-3 rounded-xl bg-white px-4 py-2 text-xs font-black text-[#7A2D2D] ring-1 ring-red-200 disabled:opacity-50">Cancelar reserva</button>
                  </article>
                ))}
                {activeReservations.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Você não possui reservas ativas.</p>}
              </div>
            </section>
          </div>
        )}
      </section>

      {selectedTitle && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedTitleId(""); }}>
          <section className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-4">
                <Cover title={selectedTitle} />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Livro do Acervo Vivo</p>
                  <h2 className="mt-1 text-2xl font-black leading-tight text-[#123D2C]">{selectedTitle.title}</h2>
                  {(selectedTitle.authors ?? []).length > 0 && <p className="mt-1 text-sm font-bold text-slate-500">{selectedTitle.authors?.join(", ")}</p>}
                </div>
              </div>
              <button type="button" onClick={() => setSelectedTitleId("")} className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Fechar</button>
            </div>
            {selectedTitle.description && <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{selectedTitle.description}</p>}
            {(selectedTitle.subjects ?? []).length > 0 && <div className="mt-4 flex flex-wrap gap-2">{selectedTitle.subjects?.map((subject) => <span key={subject} className="rounded-full bg-[#E7F0E2] px-3 py-1 text-xs font-black text-[#2F6B43]">{subject}</span>)}</div>}
            <div className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <p className="font-black text-[#123D2C]">{selectedTitle.availableCopies ? `${selectedTitle.availableCopies} exemplar(es) disponível(is)` : "Nenhum exemplar disponível agora"}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Prazo padrão de empréstimo: {payload.settings?.loan_days ?? 30} dias.</p>
              {payload.settings?.member_reservations_enabled !== false && !activeReservations.some((item) => item.title_id === selectedTitle.id) && (
                <button disabled={saving} type="button" onClick={() => void run({ action: "reserve", titleId: selectedTitle.id }, "Reserva registrada. Você poderá acompanhar em Meus empréstimos e reservas.")} className="mt-3 w-full rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">Reservar este título</button>
              )}
            </div>
          </section>
        </div>
      )}

      {selectedTrail && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedTrailId(""); }}>
          <section className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Trilha de estudos</p>
                <h2 className="mt-1 text-2xl font-black text-[#123D2C]">{selectedTrail.name}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{selectedTrail.objective || selectedTrail.description}</p>
              </div>
              <button type="button" onClick={() => setSelectedTrailId("")} className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Fechar</button>
            </div>
            <div className="mt-4 grid gap-2">
              {trailItems.filter((item) => item.trail_id === selectedTrail.id).map((item, index) => {
                const title = item.title_id ? titleMap.get(item.title_id) : null;
                const resource = item.resource_id ? resourceMap.get(item.resource_id) : null;
                const currentVersion = resource ? versions.find((version) => version.resource_id === resource.id) : null;
                return (
                  <article key={item.id} className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">{index + 1}. {title ? "Livro" : resource ? typeLabel(resource.resource_type) : "Conteúdo"}{item.required ? " • recomendado" : ""}</p>
                    <p className="mt-1 font-black text-[#123D2C]">{title?.title || resource?.title || "Item em configuração"}</p>
                    {item.note && <p className="mt-1 text-sm font-semibold text-slate-600">{item.note}</p>}
                    {title && <button type="button" onClick={() => { setSelectedTrailId(""); setSelectedTitleId(title.id); }} className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#2F6B43] ring-1 ring-[#2F6B43]/20">Ver livro</button>}
                    {resource && currentVersion?.source_url && <a href={currentVersion.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-black text-[#2F6B43] ring-1 ring-[#2F6B43]/20">Abrir conteúdo vigente</a>}
                  </article>
                );
              })}
              {trailItems.filter((item) => item.trail_id === selectedTrail.id).length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Esta trilha está criada, mas sua curadoria ainda está em validação.</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
