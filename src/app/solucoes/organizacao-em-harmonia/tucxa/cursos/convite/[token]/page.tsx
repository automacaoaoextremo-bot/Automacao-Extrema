"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const API = "/api/organizacao-em-harmonia/site-tucxa/cursos";

type Invitation = {
  id: string;
  name: string;
  email?: string | null;
  whatsapp?: string | null;
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

type ActiveModal = "confirmacao" | "cronograma" | null;

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

function onlyDigits(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

function formatWhatsapp(value?: string | null) {
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value?.trim() || "Não informado";
}

async function fetchInvitationPayload(token: string) {
  const response = await fetch(`${API}?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const next = (await response.json().catch(() => ({}))) as Payload;
  if (!response.ok) throw new Error(next.error || "Não foi possível abrir este convite.");
  return next;
}

function TouchHint() {
  return (
    <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">
      TOQUE PARA ABRIR
    </span>
  );
}

function ModalShell({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="shrink-0 border-b border-[#123D2C]/10 px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                {eyebrow}
              </p>
              <h2 className="mt-1 text-xl font-black leading-tight text-[#123D2C]">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white"
            >
              Fechar
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {children}
        </div>
      </section>
    </div>
  );
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
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

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
        if (!active) return;
        setPayload(next);
        setEmail(next.invitation?.email || "");
        setWhatsapp(next.invitation?.whatsapp || "");
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

  useEffect(() => {
    if (!activeModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveModal(null);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeModal]);

  const invitation = payload.invitation;
  const accepted = invitation?.status === "aceito";
  const declined = invitation?.status === "recusado";
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

  async function acceptInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;

    setWorking(true);
    setError("");
    setSuccess("");
    setRegistrationNeeded(false);

    try {
      const body: Record<string, unknown> = { action: "accept" };
      if (!invitation?.linked) {
        body.email = email;
        body.whatsapp = whatsapp || invitation?.whatsapp || "";
      }

      const result = await post(body);

      if (result.needsRegistration === true) {
        setRegistrationNeeded(true);
        if (typeof result.registerUrl === "string") {
          setRegisterUrl(result.registerUrl);
        }
        setSuccess(
          typeof result.message === "string"
            ? result.message
            : "Faça seu cadastro rápido e depois volte a este convite.",
        );
        return;
      }

      setSuccess("Participação confirmada. O cronograma já está disponível.");
      await load();
      setActiveModal(null);
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
      setActiveModal(null);
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
          { label: "Início", href: "#inicio", variant: "primary" },
          { label: "Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa" },
        ]}
        navLabel="Convite para curso do Tucxa"
        mobileActionColumns={2}
      />

      <section
        id="inicio"
        className="mx-auto grid max-w-xl scroll-mt-44 gap-3 px-3 py-3 sm:px-5 sm:py-5"
      >
        {loading && (
          <p className="rounded-3xl bg-white p-5 font-bold text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">
            Carregando seu convite...
          </p>
        )}

        {!loading && error && !payload.course && (
          <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-red-100">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">
              Convite
            </p>
            <h1 className="mt-2 text-2xl font-black text-[#123D2C]">
              Não foi possível abrir
            </h1>
            <p className="mt-3 font-semibold leading-6 text-slate-600">{error}</p>
          </section>
        )}

        {payload.course && invitation && (
          <>
            <section className="rounded-[1.7rem] bg-[#123D2C] p-4 text-white shadow-xl sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#CFE2C7]">
                Cursos em Harmonia
              </p>
              <h1 className="mt-1.5 text-2xl font-black leading-tight">
                {payload.course.name}
              </h1>
              <p className="mt-2 text-sm font-semibold leading-5 text-[#EEF7EA]">
                Olá, {invitation.name}. Escolha abaixo o que precisa fazer agora.
              </p>
            </section>

            {(error || success) && (
              <p
                className={`rounded-2xl p-3 text-sm font-bold ring-1 ${
                  error
                    ? "bg-red-50 text-red-700 ring-red-200"
                    : "bg-emerald-50 text-emerald-800 ring-emerald-200"
                }`}
              >
                {error || success}
              </p>
            )}

            <section className="grid grid-cols-2 gap-2">
              {!accepted && !declined && (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setRegistrationNeeded(false);
                    setActiveModal("confirmacao");
                  }}
                  className="min-h-28 rounded-[1.4rem] bg-[#E9F2E7] p-3 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5"
                >
                  <span className="block text-base font-black leading-tight text-[#123D2C]">
                    Confirmar participação
                  </span>
                  <TouchHint />
                </button>
              )}

              {accepted && (
                <div className="min-h-28 rounded-[1.4rem] bg-emerald-50 p-3 ring-1 ring-emerald-200">
                  <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                    Participação
                  </span>
                  <span className="mt-1 block text-base font-black leading-tight text-emerald-900">
                    Confirmada
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-emerald-800">
                    Você já está neste curso.
                  </span>
                </div>
              )}

              {declined && (
                <div className="min-h-28 rounded-[1.4rem] bg-slate-100 p-3 ring-1 ring-slate-200">
                  <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Participação
                  </span>
                  <span className="mt-1 block text-base font-black leading-tight text-slate-700">
                    Convite recusado
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setActiveModal("cronograma");
                }}
                className="min-h-28 rounded-[1.4rem] bg-white p-3 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5"
              >
                <span className="block text-base font-black leading-tight text-[#123D2C]">
                  Cronograma e presença
                </span>
                <TouchHint />
              </button>
            </section>

            <p className="text-center text-xs font-semibold leading-5 text-slate-500">
              Use os botões para abrir somente a informação necessária, sem percorrer uma página longa.
            </p>
          </>
        )}
      </section>

      {activeModal === "confirmacao" && payload.course && invitation && (
        <ModalShell
          eyebrow="Confirmação"
          title="Quero participar deste curso"
          onClose={() => setActiveModal(null)}
        >
          <form onSubmit={acceptInvitation} className="grid gap-3">
            {invitation.linked ? (
              <section className="rounded-3xl bg-[#F2F8EE] p-4 ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                  Cadastro localizado
                </p>
                <p className="mt-2 text-lg font-black text-[#123D2C]">
                  {invitation.name}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Seu cadastro já está vinculado ao Tucxa. Não é necessário informar
                  WhatsApp, e-mail ou fazer outro cadastro. Confirme apenas sua participação.
                </p>
              </section>
            ) : (
              <>
                <section className="rounded-3xl bg-[#F2F8EE] p-4 ring-1 ring-[#123D2C]/10">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                    Confirme os dados do convite
                  </p>
                  <dl className="mt-3 grid gap-2">
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                      <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Nome
                      </dt>
                      <dd className="mt-1 font-black text-[#123D2C]">{invitation.name}</dd>
                    </div>
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                      <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        WhatsApp informado
                      </dt>
                      <dd className="mt-1 font-black text-[#123D2C]">
                        {formatWhatsapp(invitation.whatsapp)}
                      </dd>
                    </div>
                  </dl>
                </section>

                <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                  E-mail <span className="font-semibold text-slate-500">(opcional)</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="rounded-2xl border border-[#123D2C]/15 px-3 py-3 font-semibold outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                    placeholder="nome@email.com"
                  />
                  <span className="text-xs font-semibold leading-5 text-slate-500">
                    Se quiser, inclua um e-mail para complementar seu cadastro.
                  </span>
                </label>
              </>
            )}

            {error && (
              <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
                {success}
              </p>
            )}

            {registrationNeeded && (
              <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                <p className="text-sm font-bold leading-6 text-amber-900">
                  Seu cadastro ainda não foi localizado. Os dados do convite serão levados
                  para o cadastro rápido; depois você volta a este convite para confirmar.
                </p>
                <Link
                  href={registerUrl}
                  className="mt-3 block rounded-xl bg-amber-900 px-4 py-3 text-center text-sm font-black text-white"
                >
                  Fazer cadastro rápido
                </Link>
              </div>
            )}

            {!registrationNeeded && (
              <button
                disabled={working}
                className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50"
              >
                {working ? "Confirmando..." : "Confirmar participação"}
              </button>
            )}

            <button
              type="button"
              disabled={working}
              onClick={() => void declineInvitation()}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 disabled:opacity-50"
            >
              Não vou participar
            </button>
          </form>
        </ModalShell>
      )}

      {activeModal === "cronograma" && payload.course && invitation && (
        <ModalShell
          eyebrow="Cronograma"
          title="Aulas previstas"
          onClose={() => setActiveModal(null)}
        >
          <div className="grid gap-3">
            {payload.course.objective && (
              <div className="rounded-2xl bg-[#F2F8EE] p-3 text-sm font-semibold leading-5 text-slate-700 ring-1 ring-[#123D2C]/10">
                <strong className="text-[#123D2C]">Objetivo:</strong>{" "}
                {payload.course.objective}
              </div>
            )}
            {payload.course.rules && (
              <div className="rounded-2xl bg-[#FFF8E7] p-3 text-sm font-semibold leading-5 text-slate-700 ring-1 ring-amber-200">
                <strong className="text-[#123D2C]">Regras:</strong>{" "}
                {payload.course.rules}
              </div>
            )}
            {payload.course.planned_content && (
              <div className="rounded-2xl bg-white p-3 text-sm font-semibold leading-5 text-slate-600 ring-1 ring-[#123D2C]/10">
                <strong className="text-[#123D2C]">Conteúdo previsto:</strong>{" "}
                {payload.course.planned_content}
              </div>
            )}

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
                  className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"
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
                    <p className="mt-2 text-sm leading-5 text-slate-600">
                      {lesson.planned_content}
                    </p>
                  )}

                  {accepted && !present && (
                    <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                      <p className="text-xs font-bold leading-5 text-slate-600">
                        Durante a aula, informe o código temporário de 6 dígitos mostrado
                        pelo Professor.
                      </p>
                      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <input
                          value={codes[lesson.id] || ""}
                          onChange={(event) =>
                            setCodes((current) => ({
                              ...current,
                              [lesson.id]: event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6),
                            }))
                          }
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-center text-lg font-black tracking-[0.2em]"
                          placeholder="000000"
                          aria-label={`Código de presença da aula ${lesson.title}`}
                        />
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => void checkIn(lesson.id)}
                          className="rounded-xl bg-[#2F6B43] px-3 py-3 text-xs font-black text-white disabled:opacity-50"
                        >
                          Registrar
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}

            {(error || success) && (
              <p
                className={`rounded-2xl p-3 text-sm font-bold ring-1 ${
                  error
                    ? "bg-red-50 text-red-700 ring-red-200"
                    : "bg-emerald-50 text-emerald-800 ring-emerald-200"
                }`}
              >
                {error || success}
              </p>
            )}
          </div>
        </ModalShell>
      )}
    </main>
  );
}
