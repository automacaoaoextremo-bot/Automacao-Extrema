"use client";

import { FormEvent, useMemo, useState } from "react";
import { formatDaniela50Deadline } from "@/lib/presenca-daniela50";
import { type PresencaGuestStatus } from "@/lib/presenca-querida";

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

function responseMessage() {
  return "Respostas registradas com carinho. Para quem ficou como talvez ou pendente, ainda dá para atualizar até o prazo final. Mais perto da festa, vamos mandar um lembrete carinhoso relembrando horário, local e orientações finais.";
}

export function PresencaPublicConfirmation({ token, initialGuest }: Props) {
  const [guest, setGuest] = useState(initialGuest);
  const [dietaryNotes, setDietaryNotes] = useState(initialGuest.dietary_notes ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const invitedPeople = useMemo(() => [guest, ...(guest.linked_guests ?? [])], [guest]);
  const [responses, setResponses] = useState<Record<string, PublicConfirmationStatus>>(() => {
    return [initialGuest, ...(initialGuest.linked_guests ?? [])].reduce<Record<string, PublicConfirmationStatus>>((acc, item) => {
      acc[item.id] = normalizePublicStatus(item.guest_status);
      return acc;
    }, {});
  });
  const hasLinkedGuests = invitedPeople.length > 1;
  const totalAdults = invitedPeople.reduce((sum, item) => sum + Number(item.adults_count ?? 1), 0);
  const totalChildren = invitedPeople.reduce((sum, item) => sum + Number(item.children_count ?? 0), 0);

  function updateResponse(guestId: string, status: PublicConfirmationStatus) {
    setResponses((current) => ({ ...current, [guestId]: status }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/presenca-querida/confirmar/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: invitedPeople.map((item) => ({ id: item.id, status: responses[item.id] ?? normalizePublicStatus(item.guest_status) })),
          dietaryNotes,
          notes,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar sua confirmação.");
      setGuest(result.guest ?? guest);
      setMessage(responseMessage());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar confirmação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="confirmacao" className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-[2rem] bg-white p-5 shadow-2xl ring-1 ring-rose-100 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="rounded-[1.7rem] bg-[#fff7f4] p-5 ring-1 ring-rose-100">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Seu convite</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-[#00334E]">Convite para {guest.full_name}</h2>
            <p className="mt-3 leading-7 text-slate-700">
              Sua confirmação ajuda a família a cuidar do buffet, das bebidas, das mesas, da recepção e dos detalhes da festa com mais carinho e previsibilidade.
            </p>

            <div className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-rose-100">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Prazo final para confirmar</p>
              <p className="mt-1 text-2xl font-black text-[#00334E]">{formatDaniela50Deadline()}</p>
              {hasLinkedGuests ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">Você pode confirmar uma pessoa agora e deixar outra como talvez ou pendente até o prazo final.</p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-600">Como dezembro costuma ser um mês concorrido, confirmar até essa data ajuda a família a se organizar com calma.</p>
              )}
            </div>
          </aside>

          <form onSubmit={onSubmit} className="grid gap-5">
            <div className="rounded-3xl bg-[#fffdfb] p-4 ring-1 ring-rose-100">
              <p className="text-sm leading-7 text-slate-700">
                {hasLinkedGuests
                  ? "Este convite tem mais de uma pessoa. Responda individualmente por cada uma abaixo."
                  : "Escolha abaixo a sua resposta."}
                {` Total previsto neste convite: ${totalAdults} adulto(s)${totalChildren > 0 ? ` e ${totalChildren} criança(s)` : ""}.`}
              </p>
            </div>

            <div className="grid gap-4">
              {invitedPeople.map((item, index) => {
                const selected = responses[item.id] ?? normalizePublicStatus(item.guest_status);
                return (
                  <div key={item.id} className="rounded-3xl bg-[#fff7f4] p-4 ring-1 ring-rose-100">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-lg font-black text-[#00334E]">{item.full_name}</p>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{index === 0 ? "Convidado principal" : "Convidado vinculado"}</p>
                      </div>
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
              <input value={dietaryNotes} onChange={(item) => setDietaryNotes(item.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Opcional" />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Curiosidade ou recado para a Daniela</span>
              <textarea
                value={notes}
                onChange={(item) => setNotes(item.target.value)}
                className="min-h-24 rounded-2xl border border-slate-200 p-3"
                placeholder="Deixe aqui uma curiosidade sua com a aniversariante ou um recado carinhoso."
              />
            </label>

            {message && <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">{message}</p>}
            {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

            <button type="submit" disabled={saving} className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#E85D75] px-6 py-4 text-base font-black text-white shadow-lg shadow-rose-900/15 transition hover:-translate-y-0.5 hover:bg-[#f06c84] disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Salvando..." : "Registrar minhas respostas"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
