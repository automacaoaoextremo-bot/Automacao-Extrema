"use client";

import { useState } from "react";

type ShareActionsProps = {
  publicUrl: string;
  whatsappText: string;
  clientWhatsapp?: string | null;
  compact?: boolean;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function toWhatsAppPhone(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}


export function BazarClienteShareActions({ publicUrl, whatsappText, clientWhatsapp = null, compact = false }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [typedWhatsapp, setTypedWhatsapp] = useState("");
  const registeredWhatsapp = onlyDigits(clientWhatsapp || "");
  const typedWhatsappNumber = onlyDigits(typedWhatsapp);
  const phoneForShare = registeredWhatsapp || typedWhatsappNumber;
  const whatsappPhone = toWhatsAppPhone(phoneForShare);
  const canSendDirectly = whatsappPhone.length >= 12;

  function copyLink() {
    void navigator.clipboard?.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className={`space-y-3 ${compact ? "mt-3" : "mt-5"}`}>
      {!registeredWhatsapp && (
        <label className="block rounded-2xl bg-[#fff8dd] p-4 text-sm font-bold leading-6 text-[#7a5a00] ring-1 ring-[#efe3af]">
          WhatsApp não cadastrado. Para enviar este link ao cliente, informe DDD + número.
          <input
            value={typedWhatsapp}
            onChange={(event) => setTypedWhatsapp(event.target.value)}
            inputMode="tel"
            placeholder="Ex.: 19999999999"
            className="mt-3 w-full rounded-2xl border border-[#efe3af] bg-white px-4 py-3 text-base font-normal text-[#214527] outline-none focus:border-[#2f7d45]"
          />
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        <a
          href={canSendDirectly ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappText)}` : undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!canSendDirectly}
          className={`rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-[0.08em] shadow-sm sm:px-5 sm:text-sm ${
            canSendDirectly ? "bg-[#25d366] text-[#063b1c]" : "pointer-events-none bg-[#dfe8df] text-[#7a8278]"
          }`}
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

    </div>
  );
}
