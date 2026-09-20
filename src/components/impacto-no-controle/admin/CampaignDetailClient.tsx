"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/impacto-no-controle/AdminShell";
import { createSupabaseBrowserClient } from "@/lib/impacto-no-controle/supabase/browser";
import { centsToMoneyInput, cleanWhatsappMessage, formatMoneyFromCents, kgFromAmount, moneyInputToCents } from "@/lib/impacto-no-controle/format";

type CampaignDetail = {
  campaign: any;
  contributions: any[];
  numbers: any[];
  messages: any[];
  quotas: any[];
  stats: any;
};

const statusOptions = [
  ["draft", "Rascunho"],
  ["active", "Ativa"],
  ["paused", "Pausada"],
  ["closed", "Encerrada"],
  ["accountability_published", "Prestação publicada"],
];

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function publicStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Rascunho",
    active: "Ativa",
    paused: "Pausada",
    closed: "Encerrada",
    accountability_published: "Prestação publicada",
  };
  return labels[status] || status;
}

function campaignPublicUrl(slug: string) {
  if (typeof window === "undefined") return `/solucoes/impacto-no-controle/acao/${slug}`;
  return `${window.location.origin}/solucoes/impacto-no-controle/acao/${slug}`;
}

const contributionStatusLabel: Record<string, string> = {
  awaiting_payment: "aguardando pagamento/comprovante",
  pending_approval: "aguardando conferência do pagamento",
  approved: "pagamento aprovado",
  rejected: "pagamento não aprovado",
  canceled: "cancelado",
};

function buildCampaignMessage(body: string, campaign: any, stats: any) {
  const publicUrl = campaignPublicUrl(campaign.slug);
  const confirmed = Number(stats?.confirmed_amount_cents || 0);
  const target = Number(campaign.target_amount_cents || 0);
  const falta = Math.max(0, target - confirmed);
  const kg = kgFromAmount(confirmed, Number(campaign.impact_value_cents || 0));

  return cleanWhatsappMessage(body)
    .replaceAll("[LINK_ACAO]", publicUrl)
    .replaceAll("[LINK_ANDAMENTO]", publicUrl)
    .replaceAll("[LINK_ULTIMA_CHAMADA]", publicUrl)
    .replaceAll("[LINK_PRESTACAO]", `${publicUrl}#prestacao-de-contas`)
    .replaceAll("[VALOR]", formatMoneyFromCents(confirmed))
    .replaceAll("[FALTA]", formatMoneyFromCents(falta))
    .replaceAll("[KG]", String(kg))
    .replaceAll("[VALOR_FINAL]", formatMoneyFromCents(confirmed))
    .replaceAll("[KG_FINAL]", String(kg));
}

export function CampaignDetailClient({ id }: { id: string }) {
  const supabase = createSupabaseBrowserClient();
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [proofTarget, setProofTarget] = useState<any | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPaymentMethod, setProofPaymentMethod] = useState<"pix" | "other">("pix");
  const [proofNote, setProofNote] = useState("");
  const [proofSaving, setProofSaving] = useState(false);

  const token = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }, [supabase.auth]);

  const campaignToForm = useCallback((campaign: any) => ({
    title: campaign.title || "",
    subtitle: campaign.subtitle || "",
    story: campaign.story || "",
    prize_title: campaign.prize_title || "",
    prize_description: campaign.prize_description || "",
    main_image_url: campaign.main_image_url || "",
    prize_image_url: campaign.prize_image_url || "",
    gallery_images: Array.isArray(campaign.gallery_images) ? campaign.gallery_images.join("\n") : "",
    starts_at: toDateTimeLocal(campaign.starts_at),
    ends_at: toDateTimeLocal(campaign.ends_at),
    status: campaign.status || "draft",
    target_amount: centsToMoneyInput(campaign.target_amount_cents),
    extended_amount: centsToMoneyInput(campaign.extended_amount_cents),
    impact_unit: campaign.impact_unit || "participações",
    impact_value: centsToMoneyInput(campaign.impact_value_cents),
    number_count: campaign.number_count || 0,
    number_price: centsToMoneyInput(campaign.number_price_cents),
    pix_key: campaign.pix_key || "",
    pix_receiver_name: campaign.pix_receiver_name || "",
    pix_city: campaign.pix_city || "Campinas",
    regulation_text: campaign.regulation_text || "",
    data_consent_text: campaign.data_consent_text || "",
    show_buyer_names: campaign.show_buyer_names ?? true,
    reservation_minutes: campaign.reservation_minutes || 1440,
    intro_modal_enabled: Boolean(campaign.intro_modal_enabled),
    intro_modal_title: campaign.intro_modal_title || "",
    intro_modal_body: campaign.intro_modal_body || "",
  }), []);

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    const accessToken = await token();
    if (!accessToken) {
      setError("Faça login para acessar a gestão.");
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/impacto-no-controle/admin/campaigns/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Erro ao carregar campanha.");
    } else {
      setDetail(json);
      setForm(campaignToForm(json.campaign));
    }

    setLoading(false);
  }, [campaignToForm, id, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  function setField(field: string, value: any) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveConfig() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    const accessToken = await token();
    const payload = {
      title: form.title,
      subtitle: form.subtitle,
      story: form.story,
      prize_title: form.prize_title,
      prize_description: form.prize_description,
      main_image_url: form.main_image_url,
      prize_image_url: form.prize_image_url,
      gallery_images: String(form.gallery_images || "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      starts_at: toIsoOrNull(form.starts_at),
      ends_at: toIsoOrNull(form.ends_at),
      status: form.status,
      target_amount_cents: moneyInputToCents(form.target_amount),
      extended_amount_cents: moneyInputToCents(form.extended_amount),
      impact_unit: form.impact_unit,
      impact_value_cents: moneyInputToCents(form.impact_value),
      number_count: Number(form.number_count || 0),
      number_price_cents: moneyInputToCents(form.number_price),
      pix_key: form.pix_key,
      pix_receiver_name: form.pix_receiver_name,
      pix_city: form.pix_city,
      regulation_text: form.regulation_text,
      data_consent_text: form.data_consent_text,
      show_buyer_names: Boolean(form.show_buyer_names),
      reservation_minutes: Number(form.reservation_minutes || 1440),
      intro_modal_enabled: Boolean(form.intro_modal_enabled),
      intro_modal_title: form.intro_modal_title,
      intro_modal_body: form.intro_modal_body,
    };
    const res = await fetch(`/api/impacto-no-controle/admin/campaigns/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || "Erro ao salvar configurações.");
    else {
      setSuccess("Configurações salvas com sucesso.");
      await load();
    }
    setSaving(false);
  }

  async function approve(contributionId: string) {
    const accessToken = await token();
    const res = await fetch(`/api/impacto-no-controle/admin/contributions/${contributionId}/approve`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await res.json();
    if (!res.ok) alert(json.error || "Erro ao aprovar.");
    await load();
  }

  async function reject(contributionId: string) {
    const reason = prompt("Motivo da rejeição/cancelamento:") || "Pagamento não localizado.";
    const accessToken = await token();
    const res = await fetch(`/api/impacto-no-controle/admin/contributions/${contributionId}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) alert(json.error || "Erro ao rejeitar.");
    await load();
  }

  function openProofRegistration(contribution: any) {
    setProofTarget(contribution);
    setProofFile(null);
    setProofPaymentMethod("pix");
    setProofNote("");
  }

  function closeProofRegistration() {
    if (proofSaving) return;
    setProofTarget(null);
    setProofFile(null);
    setProofNote("");
  }

  async function registerProof() {
    if (!proofTarget) return;
    if (!proofFile) {
      alert("Selecione o comprovante que será registrado.");
      return;
    }

    setProofSaving(true);

    try {
      const accessToken = await token();
      const body = new FormData();
      body.append("proof", proofFile);
      body.append("payment_method", proofPaymentMethod);
      body.append("note", proofNote);

      const res = await fetch(
        `/api/impacto-no-controle/admin/contributions/${proofTarget.id}/proof`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body,
        },
      );
      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Erro ao registrar comprovante.");
        return;
      }

      setProofTarget(null);
      setProofFile(null);
      setProofPaymentMethod("pix");
      setProofNote("");
      await load();
    } finally {
      setProofSaving(false);
    }
  }

  async function deleteReservation(contribution: any) {
    const numbers = contribution.selected_numbers?.length
      ? contribution.selected_numbers.map((n: number) => String(n).padStart(2, "0")).join(", ")
      : "sem números";

    const confirmed = window.confirm(
      `Excluir a reserva de ${contribution.participant_name}?\n\n` +
        `Status: ${contributionStatusLabel[contribution.status] || contribution.status}\n` +
        `Valor: ${formatMoneyFromCents(contribution.amount_cents)}\n` +
        `Números: ${numbers}\n\n` +
        "Os números serão liberados novamente. Esta ação é permitida apenas para reservas aguardando pagamento/comprovante.",
    );

    if (!confirmed) return;

    const accessToken = await token();
    const res = await fetch(
      `/api/impacto-no-controle/admin/contributions/${contribution.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Erro ao excluir reserva.");
      return;
    }

    await load();
  }

  async function openProof(path: string) {
    const accessToken = await token();
    const res = await fetch(`/api/impacto-no-controle/admin/proof-url?path=${encodeURIComponent(path)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await res.json();
    if (!res.ok) return alert(json.error || "Erro ao abrir comprovante.");
    window.open(json.url, "_blank");
  }

  async function copyAcquisitionWhatsApp(c: any) {
    const publicUrl = `${window.location.origin}/solucoes/impacto-no-controle/acao/${detail?.campaign.slug}`;
    const trackUrl = `${window.location.origin}/solucoes/impacto-no-controle/acompanhar/${c.acompanhamento_token}`;
    const numbers = c.selected_numbers?.length ? c.selected_numbers.map((n: number) => String(n).padStart(2, "0")).join(", ") : "participação por cota/doação";
    const message = [
      `Olá, ${c.participant_name}! Sua participação na ação ${detail?.campaign.title} foi registrada.`,
      `Valor: ${formatMoneyFromCents(c.amount_cents)}`,
      `Números: ${numbers}`,
      `Status: ${contributionStatusLabel[c.status] || c.status}`,
      `Acompanhe por aqui: ${trackUrl}`,
      `Página da ação: ${publicUrl}`,
      "Gratidão por transformar solidariedade em impacto real."
    ].join("\n\n");

    await navigator.clipboard.writeText(message);
    alert("Mensagem para WhatsApp copiada.");
  }

  useEffect(() => {
    const updateClock = () => setCurrentTime(Date.now());
    const immediate = window.setTimeout(updateClock, 0);
    const timer = window.setInterval(updateClock, 30_000);

    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(timer);
    };
  }, []);

  const isOpen = useMemo(() => {
    if (!detail?.campaign || detail.campaign.status !== "active") return false;

    const starts = detail.campaign.starts_at ? new Date(detail.campaign.starts_at).getTime() : null;
    const ends = detail.campaign.ends_at ? new Date(detail.campaign.ends_at).getTime() : null;

    if (!starts && !ends) return true;
    if (currentTime === null) return false;

    return (!starts || currentTime >= starts) && (!ends || currentTime <= ends);
  }, [currentTime, detail]);

  return (
    <AdminShell>
      {loading ? <p>Carregando...</p> : null}
      {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
      {success ? <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">{success}</div> : null}
      {detail ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="badge">{detail.campaign.client_name}</span>
              <h1 className="mt-2 text-3xl font-black text-[var(--brand-dark)]">{detail.campaign.title}</h1>
              <p className="mt-1 text-[var(--muted)]">/{detail.campaign.slug} • Status: {publicStatusLabel(detail.campaign.status)} • {isOpen ? "Aquisições abertas" : "Aquisições fechadas ou fora do período"}</p>
            </div>
            {detail.campaign.status !== "draft" ? (
              <a className="btn-primary !w-auto" href={`/solucoes/impacto-no-controle/acao/${detail.campaign.slug}`} target="_blank">Página pública</a>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="card p-4"><p className="text-sm text-[var(--muted)]">Confirmado</p><strong className="text-2xl">{formatMoneyFromCents(detail.stats?.confirmed_amount_cents || 0)}</strong></div>
            <div className="card p-4"><p className="text-sm text-[var(--muted)]">Pendente</p><strong className="text-2xl">{formatMoneyFromCents(detail.stats?.pending_amount_cents || 0)}</strong></div>
            <div className="card p-4"><p className="text-sm text-[var(--muted)]">Impacto estimado</p><strong className="text-2xl">{detail.campaign.impact_value_cents > 0 ? `${kgFromAmount(detail.stats?.confirmed_amount_cents || 0, detail.campaign.impact_value_cents)} ${detail.campaign.impact_unit || "unidade(s)"}` : `${detail.stats?.confirmed_count || 0} participação(ões)`}</strong></div>
            <div className="card p-4"><p className="text-sm text-[var(--muted)]">Meta</p><strong className="text-2xl">{formatMoneyFromCents(detail.campaign.target_amount_cents)}</strong></div>
          </div>

          <section className="card mt-6 p-5">
            <h2 className="text-2xl font-black text-[var(--brand-dark)]">Configurações da campanha</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Estas informações controlam o que aparece na página pública e o período em que as pessoas podem adquirir números ou cotas.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div><label className="label">Título</label><input className="input" value={form.title || ""} onChange={(e) => setField("title", e.target.value)} /></div>
              <div><label className="label">Status</label><select className="input" value={form.status || "draft"} onChange={(e) => setField("status", e.target.value)}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div className="md:col-span-2"><label className="label">Subtítulo</label><input className="input" value={form.subtitle || ""} onChange={(e) => setField("subtitle", e.target.value)} /></div>
              <div className="md:col-span-2"><label className="label">História da causa</label><textarea className="input min-h-28" value={form.story || ""} onChange={(e) => setField("story", e.target.value)} /></div>
              <div><label className="label">Início das aquisições</label><input className="input" type="datetime-local" value={form.starts_at || ""} onChange={(e) => setField("starts_at", e.target.value)} /></div>
              <div><label className="label">Término das aquisições</label><input className="input" type="datetime-local" value={form.ends_at || ""} onChange={(e) => setField("ends_at", e.target.value)} /></div>
              <div><label className="label">Meta ideal (R$)</label><input className="input" value={form.target_amount || ""} onChange={(e) => setField("target_amount", e.target.value)} /></div>
              <div><label className="label">Meta estendida (R$)</label><input className="input" value={form.extended_amount || ""} onChange={(e) => setField("extended_amount", e.target.value)} /></div>
              <div><label className="label">Unidade de impacto</label><input className="input" value={form.impact_unit || ""} onChange={(e) => setField("impact_unit", e.target.value)} /></div>
              <div><label className="label">Valor estimado por unidade (R$)</label><input className="input" value={form.impact_value || ""} onChange={(e) => setField("impact_value", e.target.value)} /></div>
              <div><label className="label">Quantidade de números</label><input className="input" type="number" value={form.number_count || 0} onChange={(e) => setField("number_count", e.target.value)} /></div>
              <div><label className="label">Valor por número (R$)</label><input className="input" value={form.number_price || ""} onChange={(e) => setField("number_price", e.target.value)} /></div>
              <div><label className="label">Chave Pix</label><input className="input" value={form.pix_key || ""} onChange={(e) => setField("pix_key", e.target.value)} /></div>
              <div><label className="label">Nome do recebedor Pix</label><input className="input" value={form.pix_receiver_name || ""} onChange={(e) => setField("pix_receiver_name", e.target.value)} /></div>
              <div><label className="label">Cidade Pix</label><input className="input" value={form.pix_city || ""} onChange={(e) => setField("pix_city", e.target.value)} /></div>
              <div><label className="label">Reserva expira em quantos minutos</label><input className="input" type="number" value={form.reservation_minutes || 1440} onChange={(e) => setField("reservation_minutes", e.target.value)} /></div>
              <div className="md:col-span-2"><label className="label">URL da imagem principal</label><input className="input" value={form.main_image_url || ""} onChange={(e) => setField("main_image_url", e.target.value)} /></div>
              <div><label className="label">Prêmio / reconhecimento</label><input className="input" value={form.prize_title || ""} onChange={(e) => setField("prize_title", e.target.value)} /></div>
              <div><label className="label">URL da imagem do prêmio</label><input className="input" value={form.prize_image_url || ""} onChange={(e) => setField("prize_image_url", e.target.value)} /></div>
              <div className="md:col-span-2"><label className="label">Fotos adicionais (uma URL por linha)</label><textarea className="input min-h-32" value={form.gallery_images || ""} onChange={(e) => setField("gallery_images", e.target.value)} placeholder="/impacto-no-controle/sementinha/bike-01.jpeg" /></div>
              <div className="md:col-span-2"><label className="label">Descrição do prêmio</label><textarea className="input min-h-24" value={form.prize_description || ""} onChange={(e) => setField("prize_description", e.target.value)} /></div>
              <div className="md:col-span-2"><label className="label">Regulamento / observações</label><textarea className="input min-h-24" value={form.regulation_text || ""} onChange={(e) => setField("regulation_text", e.target.value)} /></div>
              <div className="md:col-span-2"><label className="label">Texto de consentimento</label><textarea className="input min-h-24" value={form.data_consent_text || ""} onChange={(e) => setField("data_consent_text", e.target.value)} /></div>
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 font-bold text-[var(--brand-dark)] md:col-span-2">
                <input type="checkbox" checked={Boolean(form.show_buyer_names)} onChange={(e) => setField("show_buyer_names", e.target.checked)} />
                Exibir nome abreviado abaixo dos números reservados/confirmados
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 font-bold text-[var(--brand-dark)] md:col-span-2">
                <input type="checkbox" checked={Boolean(form.intro_modal_enabled)} onChange={(e) => setField("intro_modal_enabled", e.target.checked)} />
                Exibir pop-up inicial de orientação na página pública
              </label>
              <div className="md:col-span-2"><label className="label">Título do pop-up inicial</label><input className="input" value={form.intro_modal_title || ""} onChange={(e) => setField("intro_modal_title", e.target.value)} /></div>
              <div className="md:col-span-2"><label className="label">Texto do pop-up inicial</label><textarea className="input min-h-24" value={form.intro_modal_body || ""} onChange={(e) => setField("intro_modal_body", e.target.value)} /></div>
            </div>
            <button className="btn-primary mt-5" onClick={saveConfig} disabled={saving}>{saving ? "Salvando..." : "Salvar configurações"}</button>
          </section>

          <section className="card mt-6 p-5">
            <h2 className="text-2xl font-black text-[var(--brand-dark)]">Pagamentos e participações</h2>
            <div className="table-wrap mt-4">
              <table>
                <thead><tr><th>Participante</th><th>Status</th><th>Valor</th><th>Números</th><th>Comprovante</th><th>Ações</th></tr></thead>
                <tbody>
                  {detail.contributions.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.participant_name}</strong><br /><small>{c.phone} {c.email ? `• ${c.email}` : ""}</small></td>
                      <td>{contributionStatusLabel[c.status] || c.status}</td>
                      <td>{formatMoneyFromCents(c.amount_cents)}</td>
                      <td>{c.selected_numbers?.join(", ") || "-"}</td>
                      <td>{c.proof_file_path ? <button className="btn-secondary !w-auto !py-2" onClick={() => openProof(c.proof_file_path)}>Abrir</button> : "-"}</td>
                      <td className="flex flex-wrap gap-2">
                        <button className="btn-secondary !w-auto !py-2" onClick={() => copyAcquisitionWhatsApp(c)}>Copiar WhatsApp</button>
                        {["awaiting_payment", "pending_approval"].includes(c.status) ? (
                          <button className="btn-secondary !w-auto !py-2" onClick={() => openProofRegistration(c)}>
                            {c.proof_file_path ? "Substituir comprovante" : "Registrar comprovante"}
                          </button>
                        ) : null}
                        {c.status === "awaiting_payment" ? (
                          <button className="btn-secondary !w-auto !py-2 !border-red-300 !text-red-700" onClick={() => deleteReservation(c)}>
                            Excluir reserva
                          </button>
                        ) : null}
                        {c.status === "pending_approval" ? <button className="btn-primary !w-auto !py-2" onClick={() => approve(c.id)}>Aprovar</button> : null}
                        {c.status === "pending_approval" ? <button className="btn-secondary !w-auto !py-2" onClick={() => reject(c.id)}>Rejeitar</button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card mt-6 p-5">
            <h2 className="text-2xl font-black text-[var(--brand-dark)]">Números</h2>
            <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-12">
              {detail.numbers.map((n) => (
                <div key={n.number} className={`number-button ${n.status === "confirmed" ? "confirmed" : ""} ${n.status !== "available" && n.status !== "confirmed" ? "pending" : ""}`}>
                  {String(n.number).padStart(2, "0")}
                  {n.buyer_display_name ? <small>{n.buyer_display_name}</small> : null}
                </div>
              ))}
            </div>
          </section>

          <section className="card mt-6 p-5">
            <h2 className="text-2xl font-black text-[var(--brand-dark)]">Mensagens prontas</h2>
            <div className="mt-4 grid gap-4">
              {detail.messages.map((m) => {
                const preparedMessage = buildCampaignMessage(m.body, detail.campaign, detail.stats);
                return (
                  <div key={m.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                    <p className="font-extrabold">{m.title}</p>
                    <textarea className="input mt-2 min-h-32" readOnly value={preparedMessage} />
                    <button className="btn-primary mt-2 !w-auto" onClick={() => navigator.clipboard.writeText(preparedMessage)}>Copiar mensagem</button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {proofTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[#fffdf7] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[var(--brand)]">Gestão</p>
                <h2 className="mt-1 text-2xl font-black text-[var(--brand-dark)]">Registrar comprovante</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {proofTarget.participant_name} • {formatMoneyFromCents(proofTarget.amount_cents)}
                </p>
              </div>
              <button type="button" className="btn-secondary !w-auto !py-2" onClick={closeProofRegistration} disabled={proofSaving}>
                FECHAR
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="label">Forma de pagamento</label>
                <select
                  className="input"
                  value={proofPaymentMethod}
                  onChange={(event) => setProofPaymentMethod(event.target.value === "other" ? "other" : "pix")}
                >
                  <option value="pix">Pix</option>
                  <option value="other">Outra forma combinada com o Suporte</option>
                </select>
              </div>

              <div>
                <label className="label">Comprovante *</label>
                <input
                  className="input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                />
              </div>

              <div>
                <label className="label">Observação da Gestão (opcional)</label>
                <textarea
                  className="input min-h-24"
                  value={proofNote}
                  onChange={(event) => setProofNote(event.target.value)}
                  placeholder="Ex.: pagamento em dinheiro combinado com o Suporte."
                />
              </div>

              <p className="rounded-2xl border border-[var(--border)] bg-[#fff8e8] p-4 text-sm leading-6 text-[var(--muted)]">
                Ao registrar o comprovante, a participação passa para <strong>aguardando conferência do pagamento</strong>. Os números permanecem reservados para a conferência da organização.
              </p>
            </div>

            <button type="button" className="btn-primary mt-5" onClick={registerProof} disabled={proofSaving}>
              {proofSaving ? "Registrando..." : "Registrar comprovante"}
            </button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
