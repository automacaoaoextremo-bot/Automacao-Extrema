"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const API = "/api/organizacao-em-harmonia/site-tucxa/cursos";

type Invitation = {
  id: string;
  name: string;
  status: string;
  linked: boolean;
  invitedAt?: string | null;
  acceptedAt?: string | null;
};

type Course = {
  id: string;
  name: string;
  objective?: string | null;
  rules?: string | null;
  planned_content?: string | null;
  status: string;
  active: boolean;
};

type Lesson = {
  id: string;
  title: string;
  planned_content?: string | null;
  starts_at: string;
  ends_at: string;
  location?: string | null;
  status: string;
};

type Attendance = {
  lesson_id: string;
  status: string;
  checkin_method: string;
  checked_in_at?: string | null;
};

type Payload = {
  invitation?: Invitation;
  course?: Course;
  lessons?: Lesson[];
  attendance?: Attendance[];
  error?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function attendanceFor(payload: Payload, lessonId: string) {
  return (payload.attendance ?? []).find(
    (item) => item.lesson_id === lessonId && item.status === "presente",
  );
}

async function fetchInvitationPayload(token: string) {
  const response = await fetch(`${API}?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const next = (await response.json().catch(() => ({}))) as Payload;
  if (!response.ok) throw new Error(next.error || "Não foi possível abrir este convite.");
  return next;
}

export default function ConviteCursoTucxaPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [registrationNeeded, setRegistrationNeeded] = useState(false);
  const [registerUrl, setRegisterUrl] = useState(
    "/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro",
  );
  const [codes, setCodes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setPayload(await fetchInvitationPayload(token));
  }, [token]);

  useEffect(() => {
    let active = true;

    if (!token) {
      const loadingTimer = window.setTimeout(() => {
        if (active) setLoading(false);
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(loadingTimer);
      };
    }

    void fetchInvitationPayload(token)
      .then((next) => {
        if (active) setPayload(next);
      })
      .catch((currentError) => {
        if (active) {
          setError(
            currentError instanceof Error
              ? currentError.message
              : "Não foi possível abrir este convite.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const accepted = payload.invitation?.status === "aceito";
  const declined = payload.invitation?.status === "recusado";
  const lessons = useMemo(() => payload.lessons ?? [], [payload.lessons]);

  async function post(body: Record<string, unknown>) {
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...body }),
    });
    const result = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    > & { error?: string };
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível concluir a operação.");
    }
    return result;
  }

  async function acceptInvitation(event: FormEvent) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setError("");
    setSuccess("");
    try {
      const result = await post({ action: "accept", email, whatsapp });
      if (result.needsRegistration === true) {
        setRegistrationNeeded(true);
        if (typeof result.registerUrl === "string") setRegisterUrl(result.registerUrl);
        setSuccess(
          typeof result.message === "string"
            ? result.message
            : "Faça seu cadastro e depois volte a este convite.",
        );
        return;
      }
      setRegistrationNeeded(false);
      setSuccess("Participação confirmada. Seu curso já está organizado abaixo.");
      await load();
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : "Erro ao confirmar.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function declineInvitation() {
    if (working || !window.confirm("Deseja recusar este convite para o curso?")) return;
    setWorking(true);
    setError("");
    setSuccess("");
    try {
      await post({ action: "decline" });
      setSuccess("Convite recusado.");
      await load();
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : "Erro ao recusar.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function checkIn(lessonId: string) {
    if (working) return;
    const code = (codes[lessonId] || "").trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Informe o código de presença de 6 dígitos mostrado pelo Professor.");
      return;
    }
    setWorking(true);
    setError("");
    setSuccess("");
    try {
      await post({ action: "check-in", lessonId, code });
      setSuccess("Presença registrada com sucesso.");
      setCodes((current) => ({ ...current, [lessonId]: "" }));
      await load();
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Não foi possível registrar a presença.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          {
            label: "Início",
            href: "#inicio",
            variant: "primary",
          },
          {
            label: "Tucxa",
            href: "/solucoes/organizacao-em-harmonia/tucxa",
          },
        ]}
        navLabel="Convite para curso do Tucxa"
        mobileActionColumns={2}
      />

      <section id="inicio" className="mx-auto grid max-w-3xl scroll-mt-44 gap-4 px-3 py-4 sm:px-6 sm:py-7">
        {loading && (
          <p className="rounded-3xl bg-white p-5 font-bold text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">
            Carregando seu convite...
          </p>
        )}

        {!loading && error && !payload.course && (
          <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-red-100 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">
              Convite
            </p>
            <h1 className="mt-2 text-2xl font-black text-[#123D2C]">
              Não foi possível abrir
            </h1>
            <p className="mt-3 font-semibold leading-6 text-slate-600">{error}</p>
          </section>
        )}

        {payload.course && payload.invitation && (
          <>
            <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#CFE2C7]">
                Cursos em Harmonia
              </p>
              <h1 className="mt-2 text-3xl font-black">{payload.course.name}</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#EEF7EA]">
                Olá, {payload.invitation.name}. Este convite reúne confirmação,
                cronograma e presença sem criar outro cadastro separado do Tucxa.
              </p>
              {payload.course.objective && (
                <p className="mt-4 rounded-2xl bg-white/10 p-4 text-sm font-semibold leading-6 ring-1 ring-white/15">
                  <strong>Objetivo:</strong> {payload.course.objective}
                </p>
              )}
            </section>

            {error && (
              <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
                {success}
              </p>
            )}

            {!accepted && !declined && (
              <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  Confirmação
                </p>
                <h2 className="mt-1 text-xl font-black text-[#123D2C]">
                  Quero participar deste curso
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Se seu cadastro já estiver na Base Única, informe o WhatsApp ou
                  e-mail usado no Tucxa. Caso ainda não exista cadastro, o sistema
                  orientará o cadastro antes da confirmação.
                </p>
                <form onSubmit={acceptInvitation} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    WhatsApp
                    <input
                      value={whatsapp}
                      onChange={(event) => setWhatsapp(event.target.value)}
                      inputMode="tel"
                      className="rounded-xl border border-slate-200 px-3 py-3 font-semibold"
                      placeholder="(19) 99999-9999"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    E-mail
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-3 font-semibold"
                      placeholder="nome@email.com"
                    />
                  </label>
                  <button
                    disabled={working}
                    className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50 sm:col-span-2"
                  >
                    Confirmar participação
                  </button>
                </form>
                {registrationNeeded && (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                    <p className="text-sm font-bold leading-6 text-amber-900">
                      Faça primeiro seu cadastro como Consulente / Filho de Fora.
                      Depois, volte a este mesmo convite para confirmar.
                    </p>
                    <Link
                      href={registerUrl}
                      className="mt-3 block rounded-xl bg-amber-900 px-4 py-3 text-center text-sm font-black text-white"
                    >
                      Fazer meu cadastro
                    </Link>
                  </div>
                )}
                <button
                  type="button"
                  disabled={working}
                  onClick={() => void declineInvitation()}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 disabled:opacity-50"
                >
                  Não vou participar
                </button>
              </section>
            )}

            {declined && (
              <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
                <h2 className="text-xl font-black text-[#123D2C]">Convite recusado</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Se precisar rever essa decisão, fale com o Professor ou com a
                  organização do Tucxa para receber um novo convite.
                </p>
              </section>
            )}

            <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                Cronograma
              </p>
              <h2 className="mt-1 text-xl font-black text-[#123D2C]">
                Aulas previstas
              </h2>
              {payload.course.rules && (
                <p className="mt-3 rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-[#123D2C]/10">
                  <strong>Regras:</strong> {payload.course.rules}
                </p>
              )}
              {payload.course.planned_content && (
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  <strong>Conteúdo previsto:</strong> {payload.course.planned_content}
                </p>
              )}

              <div className="mt-4 grid gap-3">
                {lessons.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                    O cronograma ainda está sendo preparado.
                  </p>
                )}
                {lessons.map((lesson) => {
                  const present = attendanceFor(payload, lesson.id);
                  return (
                    <article
                      key={lesson.id}
                      className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-black text-[#123D2C]">{lesson.title}</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-600">
                            {formatDate(lesson.starts_at)}
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            até {formatDate(lesson.ends_at)}
                            {lesson.location ? ` • ${lesson.location}` : ""}
                          </p>
                        </div>
                        {present && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                            Presença registrada
                          </span>
                        )}
                      </div>
                      {lesson.planned_content && (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {lesson.planned_content}
                        </p>
                      )}

                      {accepted && !present && (
                        <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                          <p className="text-xs font-bold leading-5 text-slate-600">
                            Durante a aula, o Professor mostrará um código temporário
                            de 6 dígitos. A presença só é aceita na janela de horário da
                            própria aula.
                          </p>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={codes[lesson.id] || ""}
                              onChange={(event) =>
                                setCodes((current) => ({
                                  ...current,
                                  [lesson.id]: event.target.value.replace(/\D/g, "").slice(0, 6),
                                }))
                              }
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={6}
                              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-center text-lg font-black tracking-[0.25em]"
                              placeholder="000000"
                              aria-label={`Código de presença da aula ${lesson.title}`}
                            />
                            <button
                              type="button"
                              disabled={working}
                              onClick={() => void checkIn(lesson.id)}
                              className="rounded-xl bg-[#2F6B43] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                            >
                              Registrar presença
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
