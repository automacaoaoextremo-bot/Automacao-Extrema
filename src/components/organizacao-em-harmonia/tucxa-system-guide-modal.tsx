"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  findTucxaGuideNode,
  findTucxaGuideScreenshot,
  TUCXA_GUIDE_SCREENSHOT_BASE,
  tucxaSystemGuide,
  type TucxaGuideNode,
} from "@/lib/organizacao-em-harmonia/tucxa-system-guide-content";

export const TUCXA_GUIDE_OPEN_EVENT = "tucxa:open-system-guide";

type GuideView = "overview" | "children" | "why" | "outcome" | "screenshot";

function NodeCard({ node, onOpen }: { node: TucxaGuideNode; onOpen: (node: TucxaGuideNode) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(node)}
      className="min-h-24 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#F2F8EE]"
    >
      <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">{node.eyebrow}</span>
      <span className="mt-1 block text-sm font-black leading-tight text-[#123D2C] sm:text-base">{node.title}</span>
      <span className="mt-2 block text-[8px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
    </button>
  );
}

function OverviewCard({
  title,
  detail,
  onClick,
  emphasis = false,
}: {
  title: string;
  detail: string;
  onClick: () => void;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-24 rounded-2xl p-3 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 ${
        emphasis
          ? "bg-[#123D2C] text-white ring-[#123D2C] hover:bg-[#2F6B43]"
          : "bg-white text-[#123D2C] ring-[#123D2C]/10 hover:bg-[#F2F8EE]"
      }`}
    >
      <span className="block text-sm font-black leading-tight sm:text-base">{title}</span>
      <span className={`mt-2 block text-[9px] font-black uppercase tracking-[0.14em] ${emphasis ? "text-white/75" : "text-[#2F6B43]"}`}>
        {detail}
      </span>
    </button>
  );
}

export function TucxaSystemGuideModal() {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<string[]>([tucxaSystemGuide.id]);
  const [view, setView] = useState<GuideView>("overview");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const current = findTucxaGuideNode(path[path.length - 1]) ?? tucxaSystemGuide;
  const screenshot = useMemo(
    () => findTucxaGuideScreenshot(current.screenshotId),
    [current.screenshotId],
  );

  useEffect(() => {
    const openGuide = () => {
      setPath([tucxaSystemGuide.id]);
      setView("overview");
      setOpen(true);
    };

    window.addEventListener(TUCXA_GUIDE_OPEN_EVENT, openGuide);
    return () => window.removeEventListener(TUCXA_GUIDE_OPEN_EVENT, openGuide);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function openChild(child: TucxaGuideNode) {
    setPath((currentPath) => [...currentPath, child.id]);
    setView("overview");
  }

  function goBack() {
    if (view !== "overview") {
      setView("overview");
      return;
    }

    setPath((currentPath) => currentPath.length > 1 ? currentPath.slice(0, -1) : currentPath);
  }

  function goHome() {
    setPath([tucxaSystemGuide.id]);
    setView("overview");
  }

  function openDestination() {
    if (!current.href) return;

    setOpen(false);
    window.location.assign(current.href);
  }

  if (!open) return null;

  const hasChildren = Boolean(current.children?.length);
  const isRoot = path.length === 1;
  const screenshotCount = screenshot?.fileNames?.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-[#10251C]/78 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tucxa-guide-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section className="flex h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[1.7rem] bg-[#F7FAF2] shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:min-h-[38rem] sm:rounded-[1.8rem]">
        <header className="shrink-0 border-b border-[#123D2C]/10 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#2F6B43] sm:text-[10px]">Guia Vivo · Tucxa em Harmonia</p>
              <h2 id="tucxa-guide-title" className="mt-1 text-lg font-black leading-tight text-[#123D2C] sm:text-2xl">{current.title}</h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white sm:text-sm"
            >
              Fechar
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="mx-auto grid max-w-3xl gap-3">
            <section className="rounded-[1.35rem] bg-[#123D2C] p-3.5 text-white shadow-lg shadow-green-950/10 sm:p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#CFE2C7] sm:text-[10px]">{current.eyebrow}</p>
              <p className="mt-1.5 text-sm font-bold leading-5 text-[#F2F8EE] sm:text-base sm:leading-6">{current.summary}</p>
            </section>

            {hasChildren && view === "overview" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <OverviewCard
                  title="Próximo passo"
                  detail={`${current.children?.length ?? 0} caminhos`}
                  onClick={() => setView("children")}
                  emphasis
                />
                {current.why ? (
                  <OverviewCard title="Por que existe?" detail="TOQUE PARA ABRIR" onClick={() => setView("why")} />
                ) : null}
                {current.outcome ? (
                  <OverviewCard title="O que você consegue" detail="TOQUE PARA ABRIR" onClick={() => setView("outcome")} />
                ) : null}
                {screenshotCount > 0 ? (
                  <OverviewCard title="Ver a tela" detail={`${screenshotCount} ${screenshotCount === 1 ? "print" : "prints"}`} onClick={() => setView("screenshot")} />
                ) : null}
                {current.href ? (
                  <OverviewCard title={current.ctaLabel ?? "Abrir esta tela"} detail="ABRIR NO SISTEMA" onClick={openDestination} />
                ) : null}
              </div>
            ) : null}

            {hasChildren && view === "children" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {current.children?.map((child) => <NodeCard key={child.id} node={child} onOpen={openChild} />)}
              </div>
            ) : null}

            {hasChildren && view === "why" && current.why ? (
              <p className="rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-[#123D2C]/10 sm:text-base sm:leading-7">
                {current.why}
              </p>
            ) : null}

            {hasChildren && view === "outcome" && current.outcome ? (
              <p className="rounded-2xl bg-[#E9F2E7] p-4 text-sm font-semibold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:text-base sm:leading-7">
                {current.outcome}
              </p>
            ) : null}

            {hasChildren && view === "screenshot" && screenshot?.fileNames?.length ? (
              <div className="grid gap-3">
                {screenshot.fileNames.map((fileName, index) => (
                  <div key={fileName} className="rounded-2xl bg-white p-2 ring-1 ring-[#123D2C]/10">
                    <p className="mb-2 text-center text-xs font-black text-slate-500">
                      {screenshot.label}{screenshot.fileNames.length > 1 ? ` • ${index + 1}/${screenshot.fileNames.length}` : ""}
                    </p>
                    <Image
                      src={`${TUCXA_GUIDE_SCREENSHOT_BASE}/${fileName}`}
                      alt={screenshot.label}
                      width={900}
                      height={1600}
                      className="mx-auto max-h-[55dvh] w-auto rounded-xl object-contain"
                      sizes="(max-width: 768px) 94vw, 700px"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {!hasChildren ? (
              <div className="grid gap-3">
                {current.steps?.length ? (
                  <ol className="grid gap-2">
                    {current.steps.map((step, index) => (
                      <li key={`${step}-${index}`} className="flex gap-3 rounded-2xl bg-white p-3 text-sm font-semibold leading-5 text-slate-700 ring-1 ring-[#123D2C]/10">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#123D2C] text-xs font-black text-white">{index + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}

                {current.attention?.length ? (
                  <div className="grid gap-2">
                    {current.attention.map((item) => (
                      <p key={item} className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950 ring-1 ring-amber-200">{item}</p>
                    ))}
                  </div>
                ) : null}

                {current.outcome ? (
                  <p className="rounded-2xl bg-[#E9F2E7] p-3 text-sm font-semibold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
                    <strong>O que acontece depois:</strong> {current.outcome}
                  </p>
                ) : null}

                {screenshot?.fileNames?.length ? (
                  <div className="grid gap-3">
                    {screenshot.fileNames.map((fileName, index) => (
                      <div key={fileName} className="rounded-2xl bg-white p-2 ring-1 ring-[#123D2C]/10">
                        <p className="mb-2 text-center text-xs font-black text-slate-500">
                          {screenshot.label}{screenshot.fileNames.length > 1 ? ` • ${index + 1}/${screenshot.fileNames.length}` : ""}
                        </p>
                        <Image
                          src={`${TUCXA_GUIDE_SCREENSHOT_BASE}/${fileName}`}
                          alt={screenshot.label}
                          width={900}
                          height={1600}
                          className="mx-auto max-h-[48dvh] w-auto rounded-xl object-contain"
                          sizes="(max-width: 768px) 94vw, 700px"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {current.accessNote ? (
              <p className="rounded-2xl bg-[#FFF8E7] p-3 text-xs font-black leading-5 text-amber-950 ring-1 ring-amber-200">{current.accessNote}</p>
            ) : null}

            {!hasChildren && current.href ? (
              <button
                type="button"
                onClick={openDestination}
                className="rounded-2xl bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white"
              >
                {current.ctaLabel ?? "Abrir esta tela"}
              </button>
            ) : null}

            {!isRoot || view !== "overview" ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={goBack} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Voltar</button>
                <button type="button" onClick={goHome} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">Início</button>
              </div>
            ) : null}

            <p className="pb-1 text-center text-[10px] font-semibold leading-4 text-slate-500 sm:text-xs">
              Escolha um botão. Cada assunto abre em uma janela curta, sem transformar o guia em uma página longa.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
