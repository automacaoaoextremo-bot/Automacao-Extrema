"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  findTucxaGuideNode,
  findTucxaGuideScreenshot,
  TUCXA_GUIDE_SCREENSHOT_BASE,
  tucxaSystemGuide,
  type TucxaGuideNode,
} from "@/lib/organizacao-em-harmonia/tucxa-system-guide-content";

const STORAGE_KEY = "tucxa-system-guide:hidden:v1";
export const TUCXA_GUIDE_OPEN_EVENT = "tucxa:open-system-guide";

type GuidePanel =
  | "why"
  | "outcome"
  | "steps"
  | "children"
  | "screenshot"
  | "attention"
  | "access"
  | null;

function TouchHint() {
  return (
    <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">
      TOQUE PARA ABRIR
    </span>
  );
}

function ActionButton({
  title,
  subtitle,
  onClick,
  primary = false,
}: {
  title: string;
  subtitle?: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[5.25rem] rounded-2xl p-3 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 ${
        primary
          ? "bg-[#123D2C] text-white ring-[#123D2C]"
          : "bg-white text-[#123D2C] ring-[#123D2C]/10 hover:bg-[#F2F8EE]"
      }`}
    >
      <span className="block text-sm font-black leading-tight sm:text-base">{title}</span>
      {subtitle ? (
        <span
          className={`mt-1 block text-[11px] font-semibold leading-4 ${
            primary ? "text-white/80" : "text-slate-500"
          }`}
        >
          {subtitle}
        </span>
      ) : (
        <TouchHint />
      )}
    </button>
  );
}

function GuideSubModal({
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
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#10251C]/72 p-2 backdrop-blur-sm sm:p-4">
      <section
        className="flex max-h-[calc(100%-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.45rem] bg-white shadow-2xl sm:max-h-[calc(100%-2rem)] sm:rounded-[1.8rem]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="shrink-0 border-b border-[#123D2C]/10 px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-[10px]">
                {eyebrow}
              </p>
              <h3 className="mt-1 text-lg font-black leading-tight text-[#123D2C] sm:text-xl">
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white sm:text-sm"
            >
              Fechar
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
          {children}
        </div>
      </section>
    </div>
  );
}

function ChildrenPanel({
  node,
  onOpen,
}: {
  node: TucxaGuideNode;
  onOpen: (child: TucxaGuideNode) => void;
}) {
  const children = node.children ?? [];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {children.map((child, index) => (
        <button
          key={child.id}
          type="button"
          onClick={() => onOpen(child)}
          className="min-h-24 rounded-2xl bg-[#F7FAF2] p-3 text-left ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#E9F2E7]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123D2C] text-[10px] font-black text-white">
            {index + 1}
          </span>
          <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">
            {child.eyebrow}
          </span>
          <span className="mt-1 block text-sm font-black leading-tight text-[#123D2C]">
            {child.title}
          </span>
        </button>
      ))}
    </div>
  );
}

function StepsPanel({ node }: { node: TucxaGuideNode }) {
  return (
    <div className="grid gap-3">
      {node.steps?.length ? (
        <ol className="grid gap-2">
          {node.steps.map((step, index) => (
            <li
              key={`${step}-${index}`}
              className="flex gap-3 rounded-2xl bg-[#F7FAF2] p-3 text-sm font-semibold leading-5 text-slate-700 ring-1 ring-[#123D2C]/10"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#123D2C] text-xs font-black text-white">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold text-slate-600 ring-1 ring-[#123D2C]/10">
          Escolha o próximo passo do guia ou abra a tela correspondente.
        </p>
      )}

      {node.outcome && (
        <div className="rounded-2xl bg-[#E9F2E7] p-3 text-sm font-semibold leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">
          <strong className="font-black">O que acontece depois:</strong> {node.outcome}
        </div>
      )}
    </div>
  );
}

function ScreenshotPanel({
  screenshotId,
  href,
  ctaLabel,
}: {
  screenshotId?: string;
  href?: string;
  ctaLabel?: string;
}) {
  const screenshot = findTucxaGuideScreenshot(screenshotId);
  const [index, setIndex] = useState(0);

  if (!screenshot?.fileNames.length) {
    return (
      <p className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold leading-6 text-slate-600 ring-1 ring-[#123D2C]/10">
        Este passo não precisa de print para continuar. Siga as orientações do guia.
      </p>
    );
  }

  const currentFile = screenshot.fileNames[index] ?? screenshot.fileNames[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="shrink-0 text-center text-xs font-bold text-slate-600">
        {screenshot.label}
      </p>

      <div className="mt-2 flex min-h-0 flex-1 items-center justify-center rounded-2xl bg-[#F7FAF2] p-2 ring-1 ring-[#123D2C]/10">
        <Image
          src={`${TUCXA_GUIDE_SCREENSHOT_BASE}/${currentFile}`}
          alt={`${screenshot.label} — imagem ${index + 1}`}
          width={900}
          height={1600}
          className="max-h-[62dvh] w-auto max-w-full rounded-xl object-contain"
          sizes="(max-width: 768px) 94vw, 700px"
          priority={false}
        />
      </div>

      {href && (
        <Link
          href={href}
          className="mt-2 inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#123D2C] px-4 py-2.5 text-center text-xs font-black text-white sm:text-sm"
        >
          {ctaLabel ?? "Abrir esta tela"}
        </Link>
      )}

      {screenshot.fileNames.length > 1 && (
        <div className="mt-2 grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setIndex((current) =>
                current === 0 ? screenshot.fileNames.length - 1 : current - 1,
              )
            }
            className="rounded-xl bg-[#E9F2E7] px-3 py-2 text-xs font-black text-[#123D2C]"
          >
            ← Anterior
          </button>
          <span className="text-center text-xs font-black text-slate-500">
            {index + 1} de {screenshot.fileNames.length}
          </span>
          <button
            type="button"
            onClick={() =>
              setIndex((current) => (current + 1) % screenshot.fileNames.length)
            }
            className="rounded-xl bg-[#E9F2E7] px-3 py-2 text-xs font-black text-[#123D2C]"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

export function TucxaSystemGuideModal() {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<string[]>([tucxaSystemGuide.id]);
  const [panel, setPanel] = useState<GuidePanel>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const current = findTucxaGuideNode(path[path.length - 1]) ?? tucxaSystemGuide;
  const isRoot = current.id === tucxaSystemGuide.id;
  const screenshot = useMemo(
    () => findTucxaGuideScreenshot(current.screenshotId),
    [current.screenshotId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hidden = window.localStorage.getItem(STORAGE_KEY) === "1";
      setDontShowAgain(hidden);
      if (!hidden) setOpen(true);
    }, 0);

    const openGuide = () => {
      setDontShowAgain(window.localStorage.getItem(STORAGE_KEY) === "1");
      setPath([tucxaSystemGuide.id]);
      setPanel(null);
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
      if (event.key !== "Escape") return;
      if (panel) setPanel(null);
      else setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, panel]);

  function closeGuide() {
    if (dontShowAgain) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);

    setPanel(null);
    setOpen(false);
  }

  function openChild(child: TucxaGuideNode) {
    setPath((currentPath) => [...currentPath, child.id]);
    setPanel(null);
  }

  function goBack() {
    setPath((currentPath) =>
      currentPath.length > 1 ? currentPath.slice(0, -1) : currentPath,
    );
    setPanel(null);
  }

  function goHome() {
    setPath([tucxaSystemGuide.id]);
    setPanel(null);
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
      <div className="relative flex h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[1.7rem] bg-[#F7FAF2] shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:min-h-[38rem] sm:rounded-[1.8rem]">
        <header className="shrink-0 border-b border-[#123D2C]/10 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#2F6B43] sm:text-[10px]">
                Guia Vivo · Tucxa em Harmonia
              </p>
              <h2
                id="tucxa-guide-title"
                className="mt-1 text-lg font-black leading-tight text-[#123D2C] sm:text-2xl"
              >
                {current.title}
              </h2>
              {!isRoot && (
                <p className="mt-1 truncate text-[10px] font-bold text-slate-500">
                  Início do guia → {current.eyebrow}
                </p>
              )}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeGuide}
              className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white sm:text-sm"
              aria-label="Fechar Guia Vivo"
            >
              Fechar
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-5">
          <div className="mx-auto flex h-full max-w-3xl flex-col gap-3">
            <section className="shrink-0 rounded-[1.35rem] bg-[#123D2C] p-3.5 text-white shadow-lg shadow-green-950/10 sm:p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#CFE2C7] sm:text-[10px]">
                {current.eyebrow}
              </p>
              <p className="mt-1.5 text-sm font-bold leading-5 text-[#F2F8EE] sm:text-base sm:leading-6">
                {current.summary}
              </p>
            </section>

            {current.accessNote && (
              <button
                type="button"
                onClick={() => setPanel("access")}
                className="shrink-0 rounded-2xl bg-[#FFF8E7] px-3 py-2 text-left text-xs font-black text-amber-950 ring-1 ring-amber-200"
              >
                Validação / acesso necessário · TOQUE PARA VER
              </button>
            )}

            <div className="grid min-h-0 flex-1 grid-cols-2 content-center gap-2 sm:grid-cols-3">
              {current.children?.length ? (
                <ActionButton
                  title="Próximo passo"
                  subtitle={`${current.children.length} caminho${current.children.length === 1 ? "" : "s"}`}
                  onClick={() => setPanel("children")}
                  primary
                />
              ) : null}

              {current.steps?.length ? (
                <ActionButton
                  title="Como usar"
                  subtitle={`${current.steps.length} passo${current.steps.length === 1 ? "" : "s"}`}
                  onClick={() => setPanel("steps")}
                />
              ) : null}

              {current.why ? (
                <ActionButton
                  title="Por que existe?"
                  onClick={() => setPanel("why")}
                />
              ) : null}

              {current.outcome ? (
                <ActionButton
                  title="O que você consegue"
                  onClick={() => setPanel("outcome")}
                />
              ) : null}

              {screenshot?.fileNames.length ? (
                <ActionButton
                  title="Ver a tela"
                  subtitle={`${screenshot.fileNames.length} print${screenshot.fileNames.length === 1 ? "" : "s"}`}
                  onClick={() => setPanel("screenshot")}
                />
              ) : null}

              {current.attention?.length ? (
                <ActionButton title="Atenção" onClick={() => setPanel("attention")} />
              ) : null}

              {current.href && (
                <Link
                  href={current.href}
                  className="flex min-h-[5.25rem] flex-col justify-center rounded-2xl bg-[#E9F2E7] p-3 text-left text-[#123D2C] shadow-sm ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5"
                >
                  <span className="block text-sm font-black leading-tight sm:text-base">
                    {current.ctaLabel ?? "Abrir esta tela"}
                  </span>
                  <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">
                    ABRIR NO SISTEMA
                  </span>
                </Link>
              )}
            </div>

            {isRoot && (
              <p className="shrink-0 text-center text-[10px] font-semibold leading-4 text-slate-500 sm:text-xs">
                Escolha um botão. Cada assunto abre em uma nova janela curta, sem transformar o guia em uma página longa.
              </p>
            )}
          </div>
        </div>

        <footer className="shrink-0 border-t border-[#123D2C]/10 bg-white px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            {!isRoot && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-xl bg-[#E9F2E7] px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
              >
                ← Voltar
              </button>
            )}
            {!isRoot && (
              <button
                type="button"
                onClick={goHome}
                className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
              >
                Início
              </button>
            )}
            <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-xl bg-[#F7FAF2] px-2.5 py-2 text-[9px] font-black leading-tight text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:px-3 sm:text-xs">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setDontShowAgain(checked);
                  if (checked) window.localStorage.setItem(STORAGE_KEY, "1");
                  else window.localStorage.removeItem(STORAGE_KEY);
                }}
                className="h-4 w-4 shrink-0 accent-[#123D2C]"
              />
              Não mostrar automaticamente neste dispositivo
            </label>
          </div>
        </footer>

        {panel === "children" && (
          <GuideSubModal
            eyebrow="Próximo passo"
            title="O que você precisa fazer agora?"
            onClose={() => setPanel(null)}
          >
            <ChildrenPanel node={current} onOpen={openChild} />
          </GuideSubModal>
        )}

        {panel === "steps" && (
          <GuideSubModal
            eyebrow="Como usar"
            title={current.title}
            onClose={() => setPanel(null)}
          >
            <StepsPanel node={current} />
          </GuideSubModal>
        )}

        {panel === "why" && current.why && (
          <GuideSubModal
            eyebrow="Por que existe"
            title={current.title}
            onClose={() => setPanel(null)}
          >
            <div className="rounded-3xl bg-[#F2F8EE] p-5 ring-1 ring-[#123D2C]/10">
              <p className="text-base font-semibold leading-7 text-[#173323]">
                {current.why}
              </p>
            </div>
          </GuideSubModal>
        )}

        {panel === "outcome" && current.outcome && (
          <GuideSubModal
            eyebrow="O que isso ajuda você a conseguir"
            title={current.title}
            onClose={() => setPanel(null)}
          >
            <div className="rounded-3xl bg-[#E9F2E7] p-5 ring-1 ring-[#123D2C]/10">
              <p className="text-base font-semibold leading-7 text-[#173323]">
                {current.outcome}
              </p>
            </div>
          </GuideSubModal>
        )}

        {panel === "attention" && current.attention?.length ? (
          <GuideSubModal
            eyebrow="Atenção"
            title={current.title}
            onClose={() => setPanel(null)}
          >
            <ul className="grid gap-2">
              {current.attention.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950 ring-1 ring-amber-200"
                >
                  {item}
                </li>
              ))}
            </ul>
          </GuideSubModal>
        ) : null}

        {panel === "access" && current.accessNote && (
          <GuideSubModal
            eyebrow="Validação / acesso"
            title="Quando a administração participa"
            onClose={() => setPanel(null)}
          >
            <div className="rounded-3xl bg-[#FFF8E7] p-5 ring-1 ring-amber-200">
              <p className="text-base font-semibold leading-7 text-amber-950">
                {current.accessNote}
              </p>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                Quando essa validação for necessária, aguarde a liberação e continue pelo próximo passo indicado no próprio sistema.
              </p>
            </div>
          </GuideSubModal>
        )}

        {panel === "screenshot" && screenshot?.fileNames.length ? (
          <GuideSubModal
            eyebrow="Veja a tela"
            title={screenshot.label}
            onClose={() => setPanel(null)}
          >
            <ScreenshotPanel
              key={current.screenshotId ?? "guide-screenshot"}
              screenshotId={current.screenshotId}
              href={current.href}
              ctaLabel={current.ctaLabel}
            />
          </GuideSubModal>
        ) : null}
      </div>
    </div>
  );
}
