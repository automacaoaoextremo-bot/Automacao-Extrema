"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const readings = [
  { order: 1, month: "Janeiro", title: "Aconteceu na Casa Espírita", aliases: ["Aconteceu na Casa Espirita"] },
  { order: 2, month: "Fevereiro", title: "Tambores de Angola", aliases: ["Tambores De Angola"] },
  { order: 3, month: "Março", title: "Aruanda", aliases: ["Aruanda"] },
  { order: 4, month: "Abril", title: "Sabedoria de Preto Velho 2", aliases: ["Sabedoria de Preto Velho 2"] },
  { order: 5, month: "Maio", title: "O Guardião da Meia Noite", aliases: ["O Guardiao da Meia Noite", "Guardiao da Meia Noite"] },
  { order: 6, month: "Junho", title: "Uma Pérola Para o Seu Perdão", aliases: ["Uma Perola Para O Seu Perdao", "Uma Perola Para Seu Perdao"] },
  { order: 7, month: "", title: "Eu Sou Saint German - O Pequeno Grande Livro da Chama Violeta em Ação", aliases: ["Eu Sou Saint German", "O Pequeno Grande Livro da Chama Violeta em Acao"] },
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

  return titles.find((item) => {
    const current = normalize(item.title);
    return candidates.some((candidate) => current.includes(candidate) || candidate.includes(current));
  }) ?? null;
}

const actions = [
  { label: "Início", href: "#inicio", variant: "primary" as const },
  { label: "Voltar", href: ACERVO, variant: "secondary" as const },
  { label: "Grupo de Estudos", href: `${ACERVO}/grupo-de-estudos`, variant: "secondary" as const },
  { label: "Ajuda", href: "#ajuda", variant: "secondary" as const, action: "supportWhatsapp" as const },
];

export default function ClubeDoLivroPage() {
  const [titles, setTitles] = useState<TitleRow[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);

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

    return () => { active = false; };
  }, []);

  const matchedReadings = useMemo(
    () => readings.map((reading) => ({ reading, match: findCatalogMatch(reading, titles) })),
    [titles],
  );

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={actions} navLabel="Menu do Clube do Livro do Tucxa" showSupport={false} showSessionName />

      <section className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <div className="grid gap-3 rounded-[1.75rem] bg-white p-4 shadow-xl shadow-green-900/10 ring-1 ring-[#123D2C]/10 sm:grid-cols-[180px_1fr] sm:p-6">
          <Image src="/organizacao-em-harmonia/tucxa/acervo-vivo/clube-do-livro.jpeg" alt="Clube do Livro Tucxa 2026" width={640} height={640} className="mx-auto aspect-square w-full max-w-44 rounded-2xl object-cover shadow" priority />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">Acervo Vivo • leitura compartilhada</p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-[#123D2C] sm:text-3xl">Clube do Livro Tucxa</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">Aqui é a Carol Comoli e estarei conduzindo e organizando nosso Clube do Livro. Qualquer dúvida, estou à disposição.</p>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-[#2F6B43]">Participar do grupo no WhatsApp</a>
          </div>
        </div>

        <section className="mt-3 rounded-[1.75rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10 sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Como funciona</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <article className="rounded-2xl bg-white p-3 text-xs font-bold leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">Os encontros acontecem na última sexta-feira de cada mês, às 19h, de modo on-line. O link e a plataforma serão enviados perto da data.</article>
            <article className="rounded-2xl bg-white p-3 text-xs font-bold leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">É importante fazer a leitura prévia do livro para que a troca de ideias e descobertas aconteça de forma leve e fluida.</article>
            <article className="rounded-2xl bg-white p-3 text-xs font-bold leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">Os livros podem ser encontrados em e-book, Kindle, físico novo/usado ou PDF. PDFs não devem ser compartilhados no grupo por questões legais.</article>
            <article className="rounded-2xl bg-white p-3 text-xs font-bold leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">Também é possível compartilhar livros físicos com quem ainda não os possui.</article>
            <article className="rounded-2xl bg-white p-3 text-xs font-bold leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">A recomendação é começar a leitura já na primeira semana ou assim que adquirir o livro.</article>
            <article className="rounded-2xl bg-white p-3 text-xs font-bold leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">Vale anotar tópicos, curiosidades e pontos que possam enriquecer o encontro. Boa leitura!</article>
          </div>
        </section>

        <section className="mt-3 rounded-[1.75rem] bg-white p-4 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Leituras realizadas</p>
              <h2 className="mt-1 text-xl font-black text-[#123D2C]">2026</h2>
            </div>
            {!catalogReady && <span className="text-xs font-bold text-slate-500">Verificando o Acervo...</span>}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {matchedReadings.map(({ reading, match }) => (
              <article key={reading.order} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">{String(reading.order).padStart(2, "0")}{reading.month ? ` • ${reading.month}` : ""}</p>
                <h3 className="mt-1 text-sm font-black leading-5 text-[#123D2C]">{reading.title}</h3>
                {match ? (
                  <Link href={`${ACERVO}?titulo=${encodeURIComponent(match.id)}`} className="mt-2 inline-flex rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Abrir no Acervo Vivo</Link>
                ) : catalogReady ? (
                  <p className="mt-2 text-[10px] font-bold text-slate-500">Ainda não localizado no catálogo do Acervo Vivo.</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
