"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const API = "/api/organizacao-em-harmonia/site-tucxa/acervo-vivo";
const ACERVO = "/solucoes/organizacao-em-harmonia/tucxa/acervo-vivo";
const WHATSAPP = "https://chat.whatsapp.com/EFgQSChn13zHe4r6EVukYZ?mode=gi_t";

type TitleRow = {
  id: string;
  title: string;
  authors?: string[] | null;
};

type Payload = {
  titles?: TitleRow[];
};

type Popup = "como-funciona" | "leituras" | null;

const readings = [
  { order: 1, month: "Janeiro", title: "Aconteceu na Casa Espírita", aliases: ["Aconteceu na Casa Espirita"] },
  { order: 2, month: "Fevereiro", title: "Tambores de Angola", aliases: ["Tambores De Angola"] },
  { order: 3, month: "Março", title: "Aruanda", aliases: ["Aruanda"] },
  { order: 4, month: "Abril", title: "Sabedoria de Preto Velho 2", aliases: ["Sabedoria de Preto Velho 2"] },
  { order: 5, month: "Maio", title: "O Guardião da Meia Noite", aliases: ["O Guardiao da Meia Noite", "Guardiao da Meia Noite"] },
  { order: 6, month: "Junho", title: "Uma Pérola Para o Seu Perdão", aliases: ["Uma Perola Para O Seu Perdao", "Uma Perola Para Seu Perdao"] },
  { order: 7, month: "Julho", title: "Eu Sou Saint German - O Pequeno Grande Livro da Chama Violeta em Ação", aliases: ["Eu Sou Saint German", "O Pequeno Grande Livro da Chama Violeta em Acao"] },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findCatalogMatch(reading: (typeof readings)[number], titles: TitleRow[]) {
  const candidates = [reading.title, ...reading.aliases].map(normalize);
  const exact = titles.find((item) => candidates.includes(normalize(item.title)));
  if (exact) return exact;

  return (
    titles.find((item) => {
      const current = normalize(item.title);
      return candidates.some((candidate) => current.includes(candidate) || candidate.includes(current));
    }) ?? null
  );
}

function ClubModal({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.4rem] bg-white p-3 shadow-2xl sm:max-h-[92dvh] sm:rounded-[1.75rem] sm:p-5"
      >
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-[10px]">
              {eyebrow}
            </p>
            <h2 className="mt-0.5 text-lg font-black leading-tight text-[#123D2C] sm:text-2xl">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white"
          >
            Fechar
          </button>
        </div>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}

const actions = [
  { label: "Início", href: "#inicio", variant: "primary" as const },
  { label: "Voltar", href: ACERVO, variant: "secondary" as const },
  { label: "Ajuda", href: "#ajuda", variant: "secondary" as const, action: "supportWhatsapp" as const },
];

export default function ClubeDoLivroPage() {
  const [titles, setTitles] = useState<TitleRow[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [popup, setPopup] = useState<Popup>(null);

  useEffect(() => {
    let active = true;

    void fetch(API, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as Payload;
        if (!response.ok) throw new Error("Não foi possível consultar o catálogo.");
        if (active) setTitles(payload.titles ?? []);
      })
      .catch(() => {
        if (active) setTitles([]);
      })
      .finally(() => {
        if (active) setCatalogReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const matchedReadings = useMemo(
    () => readings.map((reading) => ({ reading, match: findCatalogMatch(reading, titles) })),
    [titles],
  );

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={actions}
        navLabel="Menu do Clube do Livro do Tucxa"
        showSupport={false}
        showSessionName
        mobileActionColumns={3}
        compactMobileActions
      />

      <section className="mx-auto max-w-5xl px-3 py-2 sm:px-6 sm:py-5 lg:px-8">
        <div className="grid grid-cols-[104px_1fr] gap-3 rounded-[1.45rem] bg-white p-3 shadow-xl shadow-green-900/10 ring-1 ring-[#123D2C]/10 sm:grid-cols-[180px_1fr] sm:rounded-[1.75rem] sm:p-6">
          <Image
            src="/organizacao-em-harmonia/tucxa/acervo-vivo/clube-do-livro.jpeg"
            alt="Clube do Livro Tucxa 2026"
            width={640}
            height={640}
            className="aspect-square w-full rounded-xl object-cover shadow sm:rounded-2xl"
            priority
          />
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#2F6B43] sm:text-[10px] sm:tracking-[0.18em]">
              Acervo Vivo • leitura compartilhada
            </p>
            <h1 className="mt-0.5 text-xl font-black leading-tight text-[#123D2C] sm:mt-1 sm:text-3xl">
              Clube do Livro Tucxa
            </h1>
            <p className="mt-1 text-xs font-semibold leading-4 text-slate-700 sm:mt-2 sm:text-sm sm:leading-6">
              📚 Carol Comoli conduz e organiza nosso Clube do Livro.
            </p>
          </div>
        </div>

        <section className="mt-2 grid grid-cols-3 gap-2 sm:mt-3">
          <button
            type="button"
            onClick={() => setPopup("como-funciona")}
            className="min-h-20 rounded-2xl bg-white px-2 py-2 text-center shadow ring-1 ring-[#123D2C]/10"
          >
            <span className="block text-xs font-black leading-tight text-[#123D2C] sm:text-sm">Como funciona</span>
            <span className="mt-1.5 block text-[8px] font-black uppercase tracking-[0.1em] text-[#2F6B43]">
              TOQUE PARA ABRIR
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPopup("leituras")}
            className="min-h-20 rounded-2xl bg-white px-2 py-2 text-center shadow ring-1 ring-[#123D2C]/10"
          >
            <span className="block text-xs font-black leading-tight text-[#123D2C] sm:text-sm">Leituras 2026</span>
            <span className="mt-1.5 block text-[8px] font-black uppercase tracking-[0.1em] text-[#2F6B43]">
              TOQUE PARA ABRIR
            </span>
          </button>

          <a
            href={WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-20 flex-col items-center justify-center rounded-2xl bg-[#123D2C] px-2 py-2 text-center text-white shadow"
          >
            <span className="block text-xs font-black leading-tight sm:text-sm">WhatsApp</span>
            <span className="mt-1.5 block text-[8px] font-black uppercase tracking-[0.1em] text-white/75">
              PARTICIPAR
            </span>
          </a>
        </section>

        <p className="mt-2 rounded-xl bg-[#E9F2E7] px-2.5 py-2 text-center text-[10px] font-bold leading-4 text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:text-xs">
          Escolha um botão para consultar as orientações, as leituras realizadas ou participar do grupo sem alongar a página.
        </p>
      </section>

      {popup === "como-funciona" && (
        <ClubModal title="Como funciona" eyebrow="Clube do Livro" onClose={() => setPopup(null)}>
          <div className="grid gap-2">
            <article className="rounded-2xl bg-[#F7FAF2] p-3 text-sm font-semibold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
              ✅ Nossos encontros acontecerão na última sexta-feira de cada mês às 19h de modo on-line; o link e a plataforma serão enviados perto da data do encontro.
            </article>
            <article className="rounded-2xl bg-[#F7FAF2] p-3 text-sm font-semibold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
              ✅ É importante a leitura prévia do livro para que todos possamos trocar ideias e descobertas de forma mais leve e fluída.
            </article>
            <article className="rounded-2xl bg-[#F7FAF2] p-3 text-sm font-semibold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
              ✅ Os livros podem ser encontrados em e-book, Kindle, físico novo ou usado ou em PDF. Quem utilizar PDF não deve compartilhá-lo no grupo, por questões legais. Também podemos compartilhar nossos livros com quem ainda não os tem.
            </article>
            <article className="rounded-2xl bg-[#E9F2E7] p-3 text-sm font-bold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
              📚 Recomendo que iniciem a leitura logo na primeira semana ou assim que adquirirem o livro. É sempre interessante tomar notas de tópicos e pontos de curiosidade que possam ser trazidos aos encontros. Desejo uma boa leitura a todos!
            </article>
          </div>
        </ClubModal>
      )}

      {popup === "leituras" && (
        <ClubModal title="Leituras realizadas em 2026" eyebrow="Clube do Livro" onClose={() => setPopup(null)}>
          {!catalogReady && (
            <p className="mb-2 rounded-xl bg-[#F7FAF2] p-2 text-xs font-bold text-slate-500">
              Verificando o Acervo Vivo...
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {matchedReadings.map(({ reading, match }) => (
              <article key={reading.order} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">
                  {String(reading.order).padStart(2, "0")} • {reading.month} 2026
                </p>
                <h3 className="mt-1 text-sm font-black leading-5 text-[#123D2C]">{reading.title}</h3>
                {match ? (
                  <Link
                    href={`${ACERVO}?titulo=${encodeURIComponent(match.id)}`}
                    className="mt-2 inline-flex rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white"
                  >
                    Abrir no Acervo Vivo
                  </Link>
                ) : catalogReady ? (
                  <p className="mt-2 text-[10px] font-bold text-slate-500">
                    Ainda não localizado no catálogo do Acervo Vivo.
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </ClubModal>
      )}
    </main>
  );
}
