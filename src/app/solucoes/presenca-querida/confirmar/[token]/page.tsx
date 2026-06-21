"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { formatDateBR, type PresencaGuestStatus } from "@/lib/presenca-querida";

type GuestPayload = {
  id: string;
  full_name: string;
  guest_status: PresencaGuestStatus;
  adults_count: number;
  children_count: number;
  companions_allowed: number;
  companions_confirmed_count: number;
  dietary_notes: string | null;
  notes: string | null;
  event: {
    name: string;
    host_name: string | null;
    event_date: string | null;
    event_time: string | null;
    venue_name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    public_headline: string | null;
    invitation_message: string | null;
    dress_code: string | null;
    parking_info: string | null;
  } | null;
};

const CONFIRMATION_STATUSES: PresencaGuestStatus[] = [
  "confirmado",
  "confirmado_com_acompanhantes",
  "talvez",
  "nao_podera_ir",
];

export default function PresencaConfirmarPage() {
  const params = useParams<{ token?: string | string[] }>();
  const rawToken = Array.isArray(params?.token) ? params.token[0] : params?.token;
  const token = String(rawToken ?? "").trim();

  const [guest, setGuest] = useState<GuestPayload | null>(null);
  const [status, setStatus] = useState<PresencaGuestStatus>("confirmado");
  const [adultsCount, setAdultsCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [companionsConfirmedCount, setCompanionsConfirmedCount] = useState(0);
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(token.length > 0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    let active = true;

    fetch(`/api/presenca-querida/confirmar/${token}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Convite não localizado.");
        return result.guest as GuestPayload;
      })
      .then((data) => {
        if (!active) return;

        setGuest(data);
        setStatus(
          CONFIRMATION_STATUSES.includes(data.guest_status)
            ? data.guest_status
            : "confirmado",
        );
        setAdultsCount(Number(data.adults_count ?? 1));
        setChildrenCount(Number(data.children_count ?? 0));
        setCompanionsConfirmedCount(Number(data.companions_confirmed_count ?? 0));
        setDietaryNotes(data.dietary_notes ?? "");
        setNotes(data.notes ?? "");
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar convite.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

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
          status,
          adultsCount,
          childrenCount,
          companionsConfirmedCount,
          dietaryNotes,
          notes,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar sua confirmação.");
      setGuest((current) => (current ? { ...current, ...result.guest } : current));
      setMessage("Confirmação registrada com carinho. Obrigado por responder!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar confirmação.");
    } finally {
      setSaving(false);
    }
  }

  const event = guest?.event;
  const tokenError = token ? "" : "Token do convite não informado.";
  const visibleError = tokenError || error;
  const isLoading = token ? loading : false;

  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Presença Querida"
        logoSrc="/presenca-querida-logo.svg"
        logoAlt="Logo Presença Querida"
        homeHref="/solucoes/presenca-querida"
        navLabel="Menu do Presença Querida"
        actions={[]}
        sectionLinks={[]}
        topAction={
          <Link
            href="/solucoes/presenca-querida"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#E85D75]/30 bg-[#E85D75] px-4 py-2 text-sm font-black text-white shadow-md shadow-rose-200/70 transition hover:-translate-y-0.5 hover:bg-[#f06c84]"
          >
            Presença Querida
          </Link>
        }
      />

      <section className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        {isLoading && <p className="rounded-2xl bg-white p-5 shadow-sm">Carregando convite...</p>}
        {visibleError && <p className="rounded-2xl bg-red-50 p-5 font-bold text-red-700">{visibleError}</p>}

        {!isLoading && guest && (
          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">
              Confirmação de presença
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-[#00334E] sm:text-5xl">
              {event?.public_headline || `Olá, ${guest.full_name}!`}
            </h1>
            <p className="mt-3 text-lg leading-8 text-slate-700">
              {event?.invitation_message ||
                "Sua presença é muito importante. Confirme pelo formulário abaixo para ajudar na organização do evento."}
            </p>

            <div className="mt-5 rounded-3xl bg-rose-50 p-5 ring-1 ring-rose-100">
              <p className="font-black text-[#00334E]">{event?.name}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {formatDateBR(event?.event_date)} {event?.event_time ? `• ${event.event_time}` : ""}
                {event?.venue_name ? ` • ${event.venue_name}` : ""}
                {event?.city ? ` • ${event.city}${event.state ? `/${event.state}` : ""}` : ""}
              </p>
              {event?.address && <p className="mt-2 text-sm leading-6 text-slate-700">Endereço: {event.address}</p>}
              {event?.dress_code && <p className="mt-2 text-sm leading-6 text-slate-700">Traje: {event.dress_code}</p>}
              {event?.parking_info && (
                <p className="mt-2 text-sm leading-6 text-slate-700">Estacionamento: {event.parking_info}</p>
              )}
            </div>

            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
              <label>
                <span className="text-sm font-bold text-slate-700">Sua resposta</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as PresencaGuestStatus)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 bg-white p-3"
                >
                  <option value="confirmado">Sim, vou participar</option>
                  <option value="confirmado_com_acompanhantes">Sim, vou com acompanhante(s)</option>
                  <option value="talvez">Talvez</option>
                  <option value="nao_podera_ir">Não poderei ir</option>
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label>
                  <span className="text-sm font-bold text-slate-700">Adultos</span>
                  <input
                    type="number"
                    min={0}
                    value={adultsCount}
                    onChange={(event) => setAdultsCount(Number(event.target.value))}
                    className="mt-1 w-full rounded-2xl border border-slate-300 p-3"
                  />
                </label>
                <label>
                  <span className="text-sm font-bold text-slate-700">Crianças</span>
                  <input
                    type="number"
                    min={0}
                    value={childrenCount}
                    onChange={(event) => setChildrenCount(Number(event.target.value))}
                    className="mt-1 w-full rounded-2xl border border-slate-300 p-3"
                  />
                </label>
                <label>
                  <span className="text-sm font-bold text-slate-700">Acompanhantes</span>
                  <input
                    type="number"
                    min={0}
                    max={guest.companions_allowed ?? 0}
                    value={companionsConfirmedCount}
                    onChange={(event) => setCompanionsConfirmedCount(Number(event.target.value))}
                    className="mt-1 w-full rounded-2xl border border-slate-300 p-3"
                  />
                </label>
              </div>

              <label>
                <span className="text-sm font-bold text-slate-700">Observação alimentar ou cuidado especial</span>
                <input
                  value={dietaryNotes}
                  onChange={(event) => setDietaryNotes(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 p-3"
                  placeholder="Opcional"
                />
              </label>

              <label>
                <span className="text-sm font-bold text-slate-700">Recado para quem organiza</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1 min-h-24 w-full rounded-2xl border border-slate-300 p-3"
                  placeholder="Opcional"
                />
              </label>

              {message && <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</p>}
              {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#E85D75] px-6 py-4 text-center text-base font-black text-white shadow-lg shadow-rose-900/15 transition hover:-translate-y-0.5 hover:bg-[#f06c84] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar confirmação"}
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
