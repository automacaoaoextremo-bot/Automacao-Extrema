"use client";

import { FormEvent, useMemo, useState } from "react";
import { buildRelationshipLine, formatDaniela50Deadline } from "@/lib/presenca-daniela50";
import { PRESENCA_GUEST_STATUS_LABELS, type PresencaGuestStatus } from "@/lib/presenca-querida";

type LinkedGuest = {
  id: string;
  full_name: string;
  guest_status: PresencaGuestStatus;
  relationship_label?: string | null;
  relationship_context?: string | null;
  group_name?: string | null;
  adults_count?: number | null;
  children_count?: number | null;
};

export type PresencaPublicGuestPayload = LinkedGuest & {
  invite_context?: string | null;
  message_preview?: string | null;
  dietary_notes?: string | null;
  notes?: string | null;
  linked_guests?: LinkedGuest[];
};

type Props = {
  token: string;
  initialGuest: PresencaPublicGuestPayload;
};

const RESPONSE_OPTIONS: Array<{ status: PresencaGuestStatus; title: string; description: string }> = [
  {
    status: "confirmado",
    title: "Sim, confirmo presença",
    description: "Esta resposta confirma você e os convidados vinculados a este convite.",
  },
  {
    status: "talvez",
    title: "Talvez eu consiga ir",
    description: "A família saberá que precisa retomar com carinho antes do fechamento da lista.",
  },
  {
    status: "nao_podera_ir",
    title: "Não poderei ir",
    description: "Sua resposta também ajuda a organizar a festa com previsibilidade.",
  },
];

function statusClass(active: boolean) {
  return active
    ? "border-[#E85D75] bg-[#E85D75] text-white shadow-lg shadow-rose-900/15"
    : "border-rose-100 bg-white text-[#00334E] hover:border-[#E85D75]/40";
}

function responseMessage(status: PresencaGuestStatus) {
  if (status === "confirmado") {
    return "Obrigado por confirmar. Mais perto da festa, vamos te mandar um lembrete carinhoso relembrando horário, local e orientações finais.";
  }

  if (status === "talvez") {
    return `Resposta registrada com carinho. Como dezembro costuma ter muitos compromissos, vamos retomar antes do prazo final de ${formatDaniela50Deadline()} para ajudar no fechamento da lista.`;
  }

  if (status === "nao_podera_ir") {
    return "Obrigado por responder. Sua resposta ajuda a família a organizar a recepção, o buffet e os detalhes finais com mais tranquilidade.";
  }

  return "Resposta registrada com carinho.";
}

export function PresencaPublicConfirmation({ token, initialGuest }: Props) {
  const [guest, setGuest] = useState(initialGuest);
  const [status, setStatus] = useState<PresencaGuestStatus>(initialGuest.guest_status === "talvez" || initialGuest.guest_status === "nao_podera_ir" ? initialGuest.guest_status : "confirmado");
  const [dietaryNotes, setDietaryNotes] = useState(initialGuest.dietary_notes ?? "");
  const [notes, setNotes] = useState(initialGuest.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const invitedPeople = useMemo(() => [guest, ...(guest.linked_guests ?? [])], [guest]);
  const totalAdults = invitedPeople.reduce((sum, item) => sum + Number(item.adults_count ?? 1), 0);
  const totalChildren = invitedPeople.reduce((sum, item) => sum + Number(item.children_count ?? 0), 0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/presenca-querida/confirmar/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, dietaryNotes, notes }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar sua confirmação.");
      setGuest(result.guest ?? guest);
      setMessage(responseMessage(status));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar confirmação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="confirmacao" className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-[2rem] bg-white p-5 shadow-2xl ring-1 ring-rose-100 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-[1.7rem] bg-[#fff7f4] p-5 ring-1 ring-rose-100">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Seu convite</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-[#00334E]">Confirme com carinho</h2>
            <p className="mt-3 leading-7 text-slate-700">
              A confirmação ajuda a preparar buffet, bebidas, mesas, crianças, recepção e lembranças com cuidado. Como a festa é em dezembro, reservar a data agora evita conflito com outras confraternizações de fim de ano.
            </p>
            <div className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-rose-100">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Prazo ideal</p>
              <p className="mt-1 text-2xl font-black text-[#00334E]">{formatDaniela50Deadline()}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Depois dessa data, a família fecha os números principais para a operação da festa.</p>
            </div>
            <div className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-rose-100">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Seu vínculo</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{guest.invite_context || buildRelationshipLine(guest)}</p>
            </div>
          </aside>

          <form onSubmit={onSubmit} className="grid gap-5">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Quem está neste convite</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {invitedPeople.map((item) => (
                  <div key={item.id} className="rounded-3xl bg-[#fff7f4] p-4 ring-1 ring-rose-100">
                    <p className="font-black text-[#00334E]">{item.full_name}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{PRESENCA_GUEST_STATUS_LABELS[item.guest_status] ?? item.guest_status}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{buildRelationshipLine(item)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Esta resposta vale para {invitedPeople.length === 1 ? "este convite individual" : "todos os nomes vinculados a este convite"}. Total previsto: {totalAdults} adulto(s){totalChildren > 0 ? ` e ${totalChildren} criança(s)` : ""}.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {RESPONSE_OPTIONS.map((option) => (
                <button
                  key={option.status}
                  type="button"
                  onClick={() => setStatus(option.status)}
                  className={`rounded-3xl border p-4 text-left transition ${statusClass(status === option.status)}`}
                >
                  <span className="block text-lg font-black">{option.title}</span>
                  <span className={`mt-2 block text-sm leading-6 ${status === option.status ? "text-white/90" : "text-slate-600"}`}>{option.description}</span>
                </button>
              ))}
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Observação alimentar ou cuidado especial</span>
              <input value={dietaryNotes} onChange={(item) => setDietaryNotes(item.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Opcional" />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Recado para a família</span>
              <textarea value={notes} onChange={(item) => setNotes(item.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" placeholder="Opcional" />
            </label>

            {message && <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">{message}</p>}
            {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

            <button type="submit" disabled={saving} className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#E85D75] px-6 py-4 text-base font-black text-white shadow-lg shadow-rose-900/15 transition hover:-translate-y-0.5 hover:bg-[#f06c84] disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Salvando..." : "Registrar minha resposta"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
