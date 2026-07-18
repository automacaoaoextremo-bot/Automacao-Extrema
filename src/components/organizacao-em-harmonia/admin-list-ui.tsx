"use client";

import { ReactNode, useEffect, useId, useRef } from "react";

type Tone = "neutral" | "primary" | "success" | "danger" | "warning";

const buttonToneClasses: Record<Tone, string> = {
  neutral: "bg-white text-[#00334E] ring-1 ring-slate-200 hover:bg-slate-50",
  primary: "bg-[#00334E] text-white hover:bg-[#06451F]",
  success: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100 hover:bg-emerald-100",
  danger: "bg-red-50 text-red-700 ring-1 ring-red-100 hover:bg-red-100",
  warning: "bg-amber-50 text-amber-900 ring-1 ring-amber-100 hover:bg-amber-100",
};

export function AdminActionButton({
  children,
  onClick,
  disabled = false,
  tone = "neutral",
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: Tone;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonToneClasses[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

export function AdminStatusBadge({
  children,
  active = true,
  className = "",
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${
        active
          ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function CompactAdminRow({
  icon,
  title,
  subtitle,
  status,
  actions,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <div className="mt-0.5 shrink-0 text-xl leading-none">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="break-words text-base font-black leading-6 text-[#00334E] sm:text-lg">{title}</h3>
              {subtitle ? <div className="mt-1 text-sm font-semibold leading-5 text-slate-600">{subtitle}</div> : null}
            </div>
            {status ? <div className="shrink-0">{status}</div> : null}
          </div>
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </article>
  );
}

export function AdminModal({
  open,
  title,
  eyebrow = "Organização em Harmonia",
  onClose,
  children,
  maxWidth = "max-w-4xl",
}: {
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-stretch justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-start sm:overflow-y-auto sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:my-3 sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-[2rem] ${maxWidth}`}
      >
        <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#2F6B43]">{eyebrow}</p>
            <h2 id={titleId} className="mt-1 break-words text-xl font-black text-[#00334E] sm:text-2xl">{title}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#06451F] px-4 py-2 text-sm font-black text-white"
          >
            Fechar
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">{children}</div>
      </section>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AdminModal open={open} title={title} eyebrow="Confirmação" onClose={busy ? () => undefined : onCancel} maxWidth="max-w-lg">
      <div className="grid gap-5">
        <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-slate-200">
          {message}
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <AdminActionButton onClick={onCancel} disabled={busy} tone="neutral">{cancelLabel}</AdminActionButton>
          <AdminActionButton onClick={onConfirm} disabled={busy} tone={tone}>{busy ? "Processando..." : confirmLabel}</AdminActionButton>
        </div>
      </div>
    </AdminModal>
  );
}

export function AdminDetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>;
}

export function AdminDetailItem({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={`rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-slate-200 ${full ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">{label}</dt>
      <dd className="mt-2 break-words text-sm font-semibold leading-6 text-slate-700">{children || "—"}</dd>
    </div>
  );
}
