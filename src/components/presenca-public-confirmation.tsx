"use client";

import { FormEvent, useMemo, useState } from "react";
import { formatDaniela50Deadline } from "@/lib/presenca-daniela50";
import { PRESENCA_GUEST_STATUS_LABELS, type PresencaGuestStatus } from "@/lib/presenca-querida";

type LinkedGuest = {
  id: string;
  full_name: string;
  guest_status: PresencaGuestStatus;
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
  eventSlug: string;
  initialGuest: PresencaPublicGuestPayload;
};

type PublicConfirmationStatus = Extract<PresencaGuestStatus, "pendente" | "talvez" | "confirmado" | "nao_podera_ir">;

const RESPONSE_OPTIONS: Array<{ status: PublicConfirmationStatus; title: string; description: string }> = [
  {
    status: "confirmado",
    title: "Sim, confirma presença",
    description: "A família já pode contar com essa presença.",
  },
  {
    status: "talvez",
    title: "Talvez consiga ir",
    description: "Fica como pendente de retorno até o fechamento da lista.",
  },
  {
    status: "nao_podera_ir",
    title: "Não poderá ir",
    description: "A resposta ajuda a organizar a festa com previsibilidade.",
  },
  {
    status: "pendente",
    title: "Decidir depois",
    description: `Pode responder até ${formatDaniela50Deadline()}.`,
  },
];

function normalizePublicStatus(status: PresencaGuestStatus | null | undefined): PublicConfirmationStatus {
  if (status === "talvez" || status === "confirmado" || status === "nao_podera_ir" || status === "pendente") return status;
  return "pendente";
}

function optionClass(active: boolean) {
  return active
    ? "border-[#E85D75] bg-[#E85D75] text-white shadow-lg shadow-rose-900/15"
    : "border-rose-100 bg-white text-[#00334E] hover:border-[#E85D75]/40";
}

function statusLabel(status: PublicConfirmationStatus | PresencaGuestStatus) {
  return PRESENCA_GUEST_STATUS_LABELS[status] ?? status;
}

function alreadyAnswered(status: PresencaGuestStatus | null | undefined) {
  return status === "confirmado" || status === "talvez" || status === "nao_podera_ir";
}

function initialSelectedStatus(status: PresencaGuestStatus | null | undefined): PublicConfirmationStatus {
  if (alreadyAnswered(status)) return normalizePublicStatus(status);
  return "confirmado";
}

export function PresencaPublicConfirmation({ token, eventSlug, initialGuest }: Props) {
  const [guest, setGuest] = useState(initialGuest);
  const [dietaryNotes, setDietaryNotes] = useState(initialGuest.dietary_notes ?? "");
  const [notes, setNotes] = useState(initialGuest.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const invitedPeople = useMemo(() => [guest, ...(guest.linked_guests ?? [])], [guest]);
  const [responses, setResponses] = useState<Record<string, PublicConfirmationStatus>>(() => {
    return [initialGuest, ...(initialGuest.linked_guests ?? [])].reduce<Record<string, PublicConfirmationStatus>>((acc, item) => {
      acc[item.id] = initialSelectedStatus(item.guest_status);
      return acc;
    }, {});
  });
  const hasLinkedGuests = invitedPeople.length > 1;
  const hasAnyAnswer = invitedPeople.some((item) => alreadyAnswered(item.guest_status));
  const totalAdults = invitedPeople.reduce((sum, item) => sum + Number(item.adults_count ?? 1), 0);
  const totalChildren = invitedPeople.reduce((sum, item) => sum + Number(item.children_count ?? 0), 0);

  function updateResponse(guestId: string, status: PublicConfirmationStatus) {
    setResponses((current) => ({ ...current, [guestId]: status }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/presenca-querida/confirmar/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: invitedPeople.map((item) => ({ id: item.id, status: responses[item.id] ?? initialSelectedStatus(item.guest_status) })),
          dietaryNotes,
          notes,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar sua confirmação.");
      setGuest(result.guest ?? guest);
      window.location.href = `/solucoes/presenca-querida/evento/${encodeURIComponent(eventSlug)}/obrigado?convite=${encodeURIComponent(token)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar confirmação.");
      setSaving(false);
    }
  }

  return (
    <section id="confirmacao" className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="rounded-[1.6rem] bg-white p-4 shadow-2xl ring-1 ring-rose-100 sm:rounded-[2rem] sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-[1.4rem] bg-[#fff7f4] p-4 ring-1 ring-rose-100 sm:rounded-[1.7rem] sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#E85D75] sm:text-sm sm:tracking-[0.3em]">Seu convite</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-[#00334E] sm:text-3xl">Convite para {guest.full_name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
              Sua confirmação ajuda a família a cuidar do buffet, das bebidas, das mesas, da recepção e dos detalhes da festa com mais carinho e previsibilidade.
            </p>

            {hasAnyAnswer && (
              <div className="mt-4 rounded-3xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-100">
                <p className="font-black">Resposta já registrada</p>
                <p className="mt-1">Ao voltar a este link, você pode conferir o status atual e alterar a resposta na própria página, se necessário.</p>
              </div>
            )}

            <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-rose-100">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-xs sm:tracking-[0.18em]">Prazo final para confirmar</p>
              <p className="mt-1 text-xl font-black text-[#00334E] sm:text-2xl">{formatDaniela50Deadline()}</p>
              {hasLinkedGuests ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">Você pode confirmar uma pessoa agora e deixar outra como talvez ou pendente até o prazo final.</p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-600">Confirmar até essa data ajuda a família a se organizar com calma.</p>
              )}
            </div>
          </aside>

          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="rounded-3xl bg-[#fffdfb] p-4 text-sm leading-6 text-slate-700 ring-1 ring-rose-100">
              {hasLinkedGuests ? "Este convite tem mais de uma pessoa. Responda individualmente por cada uma abaixo." : "Escolha abaixo a sua resposta."}
              {` Total previsto neste convite: ${totalAdults} adulto(s)${totalChildren > 0 ? ` e ${totalChildren} criança(s)` : ""}.`}
            </div>

            <div className="grid gap-4">
              {invitedPeople.map((item, index) => {
                const selected = responses[item.id] ?? initialSelectedStatus(item.guest_status);
                return (
                  <div key={item.id} className="rounded-3xl bg-[#fff7f4] p-4 ring-1 ring-rose-100">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-black text-[#00334E] sm:text-lg">{item.full_name}</p>
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-xs sm:tracking-[0.16em]">{index === 0 ? "Convidado principal" : "Convidado vinculado"}</p>
                      </div>
                      <span className={`mt-2 inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ring-1 sm:mt-0 ${alreadyAnswered(item.guest_status) ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : "bg-amber-50 text-amber-800 ring-amber-100"}`}>
                        Atual: {statusLabel(item.guest_status ?? "pendente")}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {RESPONSE_OPTIONS.map((option) => (
                        <button
                          key={option.status}
                          type="button"
                          onClick={() => updateResponse(item.id, option.status)}
                          className={`rounded-2xl border p-3 text-left transition ${optionClass(selected === option.status)}`}
                        >
                          <span className="block text-sm font-black">{option.title}</span>
                          <span className={`mt-1 block text-xs leading-5 ${selected === option.status ? "text-white/90" : "text-slate-600"}`}>{option.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Observação alimentar ou cuidado especial</span>
              <input value={dietaryNotes} onChange={(item) => setDietaryNotes(item.target.value)} className="rounded-2xl border border-slate-200 p-3 text-sm" placeholder="Opcional" />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Curiosidade ou recado para a Daniela</span>
              <textarea
                value={notes}
                onChange={(item) => setNotes(item.target.value)}
                className="min-h-24 rounded-2xl border border-slate-200 p-3 text-sm"
                placeholder="Deixe aqui uma curiosidade sua com a aniversariante ou um recado carinhoso."
              />
              <span className="text-xs leading-5 text-slate-500">
                O recado será enviado para aprovação da família antes de aparecer na seção “Recados para a Dani”.
              </span>
            </label>

            <div className="rounded-3xl bg-rose-50 p-4 text-sm leading-6 text-[#00334E] ring-1 ring-rose-100">
              <p className="font-black">Importante</p>
              <p className="mt-1">Caso confirme e aconteça algum imprevisto que impeça sua presença, avise o quanto antes ou volte a este link para alterar sua resposta.</p>
              <p className="mt-2">Se deixar um recado, ele não será publicado automaticamente: a família aprova antes de entrar na LP.</p>
            </div>

            {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

            <button type="submit" disabled={saving} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#E85D75] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-rose-900/15 transition hover:-translate-y-0.5 hover:bg-[#f06c84] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-14 sm:py-4 sm:text-base">
              {saving ? "Salvando..." : "Registrar minhas respostas"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
