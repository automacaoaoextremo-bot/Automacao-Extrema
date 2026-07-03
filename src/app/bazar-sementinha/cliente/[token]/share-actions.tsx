"use client";

import { useState } from "react";

type ShareActionsProps = {
  publicUrl: string;
  whatsappText: string;
  compact?: boolean;
};

export function BazarClienteShareActions({ publicUrl, whatsappText, compact = false }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    void navigator.clipboard?.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "mt-3" : "mt-5"}`}>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-[#25d366] px-4 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-[#063b1c] shadow-sm sm:px-5 sm:text-sm"
      >
        Enviar pelo WhatsApp
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full border border-[#dfe8df] bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-[#214527] shadow-sm sm:px-5 sm:text-sm"
      >
        {copied ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
}
