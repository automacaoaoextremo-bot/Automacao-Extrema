"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  findTucxaGuideNode,
  findTucxaGuideScreenshot,
  tucxaGuideScreenshots,
  tucxaSystemGuide,
  type TucxaGuideNode,
} from "@/lib/organizacao-em-harmonia/tucxa-system-guide-content";

const STORAGE_KEY = "tucxa-system-guide:hidden:v1";
export const TUCXA_GUIDE_OPEN_EVENT = "tucxa:open-system-guide";

function FlowArrow() {
  return <span aria-hidden="true" className="text-lg font-black text-[#2F6B43]">→</span>;
}

function BenefitBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl bg-[#F2F8EE] p-3 ring-1 ring-[#123D2C]/10 sm:p-4">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#2F6B43]">{label}</p>
      <p className="mt-1.5 text-sm font-semibold leading-6 text-[#173323] sm:text-base">{text}</p>
    </div>
  );
}

function ScreenshotPlaceholder({ screenshotId }: { screenshotId?: string }) {
  const screenshot = findTucxaGuideScreenshot(screenshotId);
  if (!screenshot) return null;

  return (
    <div className="rounded-2xl border border-dashed border-[#2F6B43]/45 bg-[#F7FAF2] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-amber-900">
          Print pendente
        </span>
        <span className="text-xs font-black text-[#123D2C]">{screenshot.fileName}</span>
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{screenshot.label}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
        Envie este print em formato mobile. O espaço já está identificado para inclusão em uma próxima atualização do guia.
      </p>
    </div>
  );
}

function Breadcrumbs({ path, onNavigate }: { path: string[]; onNavigate: (index: number) => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[0.7rem] font-black text-[#2F6B43]">
      {path.map((id, index) => {
        const node = findTucxaGuideNode(id);
        if (!node) return null;
        const isLast = index === path.length - 1;
        return (
          <div key={`${id}-${index}`} className="flex shrink-0 items-center gap-1">
            {index > 0 && <span className="text-slate-300">/</span>}
            <button
              type="button"
              onClick={() => onNavigate(index)}
              disabled={isLast}
              className={`rounded-full px-2 py-1 ${isLast ? "bg-[#E9F2E7] text-[#123D2C]" : "hover:bg-[#E9F2E7]"}`}
            >
              {index === 0 ? "Início" : node.title}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ChildrenFlow({ node, onOpen }: { node: TucxaGuideNode; onOpen: (child: TucxaGuideNode) => void }) {
  const children = node.children ?? [];
  if (!children.length) return null;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#2F6B43]">Próximo passo</p>
          <h3 className="mt-1 text-lg font-black text-[#123D2C] sm:text-xl">Escolha o caminho que corresponde ao que você precisa agora</h3>
        </div>
        <span className="shrink-0 rounded-full bg-[#123D2C] px-2.5 py-1 text-xs font-black text-white">{children.length}</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {children.map((child, index) => (
          <button
            key={child.id}
            type="button"
            onClick={() => onOpen(child)}
            className="group flex min-h-28 items-stretch gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#F7FAF2] hover:shadow-md sm:p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#123D2C] text-sm font-black text-white">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.62rem] font-black uppercase tracking-[0.15em] text-[#2F6B43]">{child.eyebrow}</span>
              <span className="mt-1 block text-base font-black leading-tight text-[#123D2C]">{child.title}</span>
              <span className="mt-1.5 block text-xs font-semibold leading-5 text-slate-600">{child.summary}</span>
            </span>
            <span className="self-center transition group-hover:translate-x-0.5"><FlowArrow /></span>
          </button>
        ))}
      </div>
    </section>
  );
}

function StepList({ steps }: { steps?: string[] }) {
  if (!steps?.length) return null;

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-[#123D2C]/10 sm:p-5">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#2F6B43]">Como usar esta tela</p>
      <ol className="mt-3 grid gap-3">
        {steps.map((step, index) => (
          <li key={`${step}-${index}`} className="flex gap-3 text-sm font-semibold leading-6 text-slate-700 sm:text-base">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#123D2C] text-xs font-black text-white">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PendingScreenshots() {
  const [expanded, setExpanded] = useState(false);
  const priorityOne = useMemo(() => tucxaGuideScreenshots.filter((item) => item.priority === 1), []);
  const visible = expanded ? tucxaGuideScreenshots : priorityOne;

  return (
    <section className="rounded-2xl bg-[#FFF8E7] p-4 ring-1 ring-amber-200 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-amber-800">Imagens do guia</p>
          <h3 className="mt-1 text-lg font-black text-[#123D2C]">Prints que ainda precisam ser enviados</h3>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            A primeira versão funciona sem imagens. Quando os prints forem enviados, cada tela já tem um ponto identificado para receber sua imagem.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
        >
          {expanded ? "Mostrar só prioridade 1" : `Ver todos (${tucxaGuideScreenshots.length})`}
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {visible.map((item) => (
          <div key={item.id} className="rounded-xl bg-white p-3 ring-1 ring-amber-100">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-black uppercase ${item.priority === 1 ? "bg-[#E9F2E7] text-[#123D2C]" : "bg-slate-100 text-slate-600"}`}>
                P{item.priority}
              </span>
              <span className="truncate text-xs font-black text-[#123D2C]" title={item.fileName}>{item.fileName}</span>
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TucxaSystemGuideModal() {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<string[]>([tucxaSystemGuide.id]);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const current = findTucxaGuideNode(path[path.length - 1]) ?? tucxaSystemGuide;
  const isRoot = current.id === tucxaSystemGuide.id;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hidden = window.localStorage.getItem(STORAGE_KEY) === "1";
      setDontShowAgain(hidden);
      if (!hidden) setOpen(true);
    }, 0);

    const openGuide = () => {
      setDontShowAgain(window.localStorage.getItem(STORAGE_KEY) === "1");
      setOpen(true);
    };

    window.addEventListener(TUCXA_GUIDE_OPEN_EVENT, openGuide);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(TUCXA_GUIDE_OPEN_EVENT, openGuide);
    };
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

  function closeGuide() {
    if (dontShowAgain) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
    setOpen(false);
  }

  function openChild(child: TucxaGuideNode) {
    setPath((currentPath) => [...currentPath, child.id]);
  }

  function goBack() {
    setPath((currentPath) => currentPath.length > 1 ? currentPath.slice(0, -1) : currentPath);
  }

  function goHome() {
    setPath([tucxaSystemGuide.id]);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-[#10251C]/78 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tucxa-guide-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeGuide();
      }}
    >
      <div className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[1.7rem] bg-[#F7FAF2] shadow-2xl sm:max-h-[92dvh] sm:rounded-[1.8rem]">
        <header className="shrink-0 border-b border-[#123D2C]/10 bg-white px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#2F6B43]">Guia Vivo · Tucxa em Harmonia</p>
              <h2 id="tucxa-guide-title" className="mt-1 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl">{current.title}</h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeGuide}
              className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white sm:px-4 sm:text-sm"
              aria-label="Fechar Guia Vivo"
            >
              Fechar
            </button>
          </div>
          <div className="mt-2">
            <Breadcrumbs path={path} onNavigate={(index) => setPath((currentPath) => currentPath.slice(0, index + 1))} />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          <div className="mx-auto grid max-w-4xl gap-4">
            <section className="rounded-[1.5rem] bg-[#123D2C] p-4 text-white shadow-lg shadow-green-950/10 sm:p-5">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#CFE2C7]">{current.eyebrow}</p>
              <p className="mt-2 text-base font-bold leading-7 text-[#F2F8EE] sm:text-lg">{current.summary}</p>
            </section>

            {(current.why || current.outcome) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {current.why && <BenefitBlock label="Por que existe" text={current.why} />}
                {current.outcome && <BenefitBlock label="O que isso ajuda você a conseguir" text={current.outcome} />}
              </div>
            )}

            {current.accessNote && (
              <div className="rounded-2xl bg-[#FFF8E7] p-3 text-sm font-bold leading-6 text-amber-950 ring-1 ring-amber-200">
                <span className="font-black">Acesso:</span> {current.accessNote}
              </div>
            )}

            <ChildrenFlow node={current} onOpen={openChild} />
            <StepList steps={current.steps} />

            {current.attention?.length ? (
              <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-amber-800">Atenção</p>
                <ul className="mt-2 grid gap-2 text-sm font-semibold leading-6 text-amber-950">
                  {current.attention.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </section>
            ) : null}

            {current.href && (
              <Link
                href={current.href}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-green-950/10 transition hover:-translate-y-0.5 hover:bg-[#2F6B43] sm:text-base"
              >
                {current.ctaLabel ?? "Abrir esta tela"}
              </Link>
            )}

            <ScreenshotPlaceholder screenshotId={current.screenshotId} />
            {isRoot && <PendingScreenshots />}
          </div>
        </div>

        <footer className="shrink-0 border-t border-[#123D2C]/10 bg-white px-3 py-3 sm:px-5">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
            {!isRoot && (
              <button type="button" onClick={goBack} className="rounded-xl bg-[#E9F2E7] px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:text-sm">
                ← Voltar
              </button>
            )}
            {!isRoot && (
              <button type="button" onClick={goHome} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 sm:text-sm">
                Início do guia
              </button>
            )}
            <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-xl bg-[#F7FAF2] px-3 py-2 text-[0.7rem] font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:text-xs">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setDontShowAgain(checked);
                  if (checked) window.localStorage.setItem(STORAGE_KEY, "1");
                  else window.localStorage.removeItem(STORAGE_KEY);
                }}
                className="h-4 w-4 accent-[#123D2C]"
              />
              Não mostrar automaticamente neste dispositivo
            </label>
          </div>
        </footer>
      </div>
    </div>
  );
}
