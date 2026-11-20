"use client";

import Link from "next/link";
import { BncPublicEventsV07B } from "./bnc-public-events-v07b";
import { useRef, useState } from "react";

type Panel = "participar" | "proximo" | null;

const basePath = "/solucoes/bingo-no-controle/cliente/tucxa";

const motivos = [
  {
    title: "Encontrar quem faz parte da nossa história",
    description: "Um momento para rever amigos, acolher novas pessoas e compartilhar boas lembranças.",
  },
  {
    title: "Viver a alegria de participar",
    description: "A graça está também na conversa, na torcida e na diversão de estarmos juntos.",
  },
  {
    title: "Apoiar as atividades da casa",
    description: "Participar ou doar prendas é uma forma de contribuir com os encontros do TUCXA.",
  },
];

function InfoButton({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[3.55rem] w-full flex-col items-center justify-center rounded-[1rem] border border-white/70 bg-[#fafffd] px-4 py-2 text-center text-[#174b35] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#eaf7ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7e4a0] sm:min-h-20"
    >
      <span className="text-[0.94rem] font-black leading-tight sm:text-lg">{title}</span>
      <span className="mt-0.5 text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#486859] sm:text-[0.65rem]">
        {subtitle}
      </span>
    </button>
  );
}

export function BingoTucxaHome({ donationHref }: { donationHref: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [panel, setPanel] = useState<Panel>(null);

  const openPanel = (value: Exclude<Panel, null>) => {
    setPanel(value);
    dialogRef.current?.showModal();
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-3 pb-3 pt-3 sm:px-5 sm:py-8">
      <section
        aria-labelledby="bingo-tucxa-title"
        className="relative flex min-h-[calc(100svh-9rem)] flex-col justify-center overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-[#0d4133] via-[#115b49] to-[#073f49] px-5 py-5 text-white shadow-xl ring-1 ring-[#0a4b39]/20 sm:min-h-[35rem] sm:rounded-[2rem] sm:px-10 sm:py-10 lg:px-16"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#8ad1a7]/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-[#f2d77d]/10 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-[32rem] flex-col sm:mx-0 sm:max-w-[43rem]">
          <p className="text-[0.64rem] font-black uppercase tracking-[0.22em] text-[#bfe8d3] sm:text-xs">
            Bingo do TUCXA · Um encontro que faz bem
          </p>
          <h1
            id="bingo-tucxa-title"
            className="mt-2.5 text-[clamp(1.65rem,7vw,2.25rem)] font-black leading-[1.13] tracking-tight sm:mt-5 sm:text-5xl sm:leading-tight"
          >
            A alegria de estar junto. O bem que fica depois.
          </h1>
          <p className="mt-3 max-w-xl text-[0.85rem] leading-[1.42] text-[#e6f6ed] sm:mt-5 sm:text-lg sm:leading-relaxed">
            Mais do que um bingo: a chance de se encontrar, sorrir e fortalecer as atividades da nossa casa.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:mt-7 sm:gap-3" aria-label="Conheça e participe do Bingo do TUCXA">
            <InfoButton
              title="Por que participar"
              subtitle="Toque para descobrir"
              onClick={() => openPanel("participar")}
            />
            <InfoButton
              title="Próximo bingo"
              subtitle="Saiba das novidades"
              onClick={() => openPanel("proximo")}
            />
            <a
              href={donationHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[3.55rem] w-full flex-col items-center justify-center rounded-[1rem] border border-[#f3e6b9] bg-[#f8e8a9] px-4 py-2 text-center text-[#28452c] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff2c8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-20"
            >
              <span className="text-[0.94rem] font-black leading-tight sm:text-lg">Quero doar uma prenda</span>
              <span className="mt-0.5 text-[0.58rem] font-black uppercase tracking-[0.14em] sm:text-[0.65rem]">
                Ajude a criar momentos especiais · WhatsApp
              </span>
            </a>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.72rem] font-semibold text-[#d7f2df] sm:mt-6 sm:justify-start sm:text-sm">
            <Link href={`${basePath}/historico`} className="underline decoration-white/40 underline-offset-4 hover:text-white">
              Histórico dos bingos
            </Link>
            <Link href={`${basePath}/admin`} className="underline decoration-white/40 underline-offset-4 hover:text-white">
              Área administrativa
            </Link>
          </div>
        </div>
      </section>

      <dialog
        ref={dialogRef}
        onClose={() => setPanel(null)}
        aria-labelledby="bingo-dialog-title"
        className="m-auto max-h-[90dvh] w-[min(92vw,35rem)] overflow-y-auto rounded-3xl border border-[#cfe4d5] bg-white p-0 text-[#153d2d] shadow-2xl backdrop:bg-[#062e24]/70"
      >
        <div className="p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#25704d]">Bingo do TUCXA</p>
            <form method="dialog">
              <button
                type="submit"
                aria-label="Fechar informações"
                className="-mt-1 rounded-full border border-[#cfe4d5] px-3 py-1.5 text-sm font-bold hover:bg-[#edf6ed]"
              >
                Fechar ×
              </button>
            </form>
          </div>

          {panel === "participar" && (
            <div>
              <h2 id="bingo-dialog-title" className="mt-3 text-2xl font-black">Por que participar?</h2>
              <p className="mt-2 leading-6 text-[#435e50]">
                Porque estar junto também é uma forma de cuidar da nossa comunidade.
              </p>
              <ul className="mt-5 space-y-4">
                {motivos.map((motivo) => (
                  <li key={motivo.title} className="rounded-2xl bg-[#f2f8f1] p-4">
                    <h3 className="font-black">{motivo.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#496154]">{motivo.description}</p>
                  </li>
                ))}
              </ul>
              <a
                href={donationHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 block rounded-xl bg-[#14573d] px-5 py-3 text-center font-extrabold text-white hover:bg-[#216d4d]"
              >
                Também quero doar uma prenda ↗
              </a>
            </div>
          )}

          {panel === "proximo" && (
            <div>
              <h2 id="bingo-dialog-title" className="mt-3 text-2xl font-black">Próximos encontros para celebrar juntos</h2>
              <p className="mt-3 leading-7 text-[#435e50]">
                Confira a programação divulgada pelo TUCXA, encontre suas pessoas queridas e faça parte de uma tarde de alegria e solidariedade. Compras antecipadas ainda estão em preparação.
              </p>
              <div className="mt-4 max-h-[38vh] overflow-y-auto"><BncPublicEventsV07B/></div>
              <div className="mt-5 rounded-2xl bg-[#f2f8f1] p-4">
                <p className="font-bold">Enquanto isso, você já pode fazer a diferença.</p>
                <p className="mt-1 text-sm leading-6 text-[#496154]">
                  Uma prenda doada com carinho ajuda a tornar nosso encontro mais especial.
                </p>
              </div>
              <a
                href={donationHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 block rounded-xl bg-[#14573d] px-5 py-3 text-center font-extrabold text-white hover:bg-[#216d4d]"
              >
                Conversar sobre uma doação ↗
              </a>
              <Link href={`${basePath}/compras-antecipadas`} className="mt-3 block rounded-xl border border-emerald-300 px-5 py-3 text-center font-extrabold text-[#14573d] hover:bg-[#eff9f2]">Conhecer compras antecipadas — em preparação</Link>
              <Link href={`${basePath}/historico`} className="mt-4 block text-center text-sm font-bold text-[#14573d] underline underline-offset-4">
                Conhecer nosso histórico de bingos
              </Link>
            </div>
          )}
        </div>
      </dialog>
    </main>
  );
}
