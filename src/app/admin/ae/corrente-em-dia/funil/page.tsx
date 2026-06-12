"use client";

import { useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { AdminPageShell } from "@/components/admin-page-shell";
import { CORRENTE_EM_DIA_FUNIL_COPIES } from "@/lib/followups";

const templates = [
  {
    key: "primeiro_contato",
    title: "Primeiro contato",
    context: "Use quando a associação, federação ou terreiro acabou de demonstrar interesse.",
    message: CORRENTE_EM_DIA_FUNIL_COPIES.primeiro_contato,
  },
  {
    key: "lead_morno",
    title: "Lead morno",
    context: "Use quando a conversa começou, mas o responsável ainda não avançou para cadastro ou reunião.",
    message: CORRENTE_EM_DIA_FUNIL_COPIES.lead_morno,
  },
  {
    key: "lead_esfriando",
    title: "Lead esfriando",
    context: "Use como último toque respeitoso antes de arquivar ou reagendar retomada futura.",
    message: CORRENTE_EM_DIA_FUNIL_COPIES.lead_esfriando,
  },
  {
    key: "cliente_fundador_curto",
    title: "Microcopy Cliente Fundador",
    context: "Use como reforço curto na conversa ou proposta, sem carregar a landing com texto demais.",
    message: CORRENTE_EM_DIA_FUNIL_COPIES.cliente_fundador_curto,
  },
];

export default function CorrenteEmDiaFunilPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copyTemplate(key: string, message: string) {
    await navigator.clipboard.writeText(message);
    setCopiedKey(key);
  }

  return (
    <AdminGuard>
      <AdminPageShell
        title="Funil Corrente em Dia"
        description="Copies de follow-up para leads mornos, leads esfriando e reforço de Cliente Fundador da solução Corrente em Dia."
      >
        <section className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <article key={template.key} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">{template.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{template.context}</p>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                {template.message}
              </div>
              <button
                type="button"
                onClick={() => copyTemplate(template.key, template.message)}
                className="mt-4 rounded-2xl bg-[#31C16B] px-4 py-3 text-sm font-black text-[#00334E] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
              >
                {copiedKey === template.key ? "Copiado" : "Copiar texto"}
              </button>
            </article>
          ))}
        </section>

        <section className="rounded-3xl bg-[#00334E] p-5 text-white shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-300">Como usar no funil</p>
          <div className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-3">
            <p className="rounded-2xl bg-white/10 p-4">
              <strong>Lead novo:</strong> envie o primeiro contato e tente marcar uma conversa curta de 10 minutos.
            </p>
            <p className="rounded-2xl bg-white/10 p-4">
              <strong>Lead morno:</strong> reforce o ganho de clareza, menos esforço manual e a possibilidade de Cliente Fundador.
            </p>
            <p className="rounded-2xl bg-white/10 p-4">
              <strong>Lead esfriando:</strong> faça um último contato respeitoso e deixe a porta aberta para retomada futura.
            </p>
          </div>
        </section>
      </AdminPageShell>
    </AdminGuard>
  );
}
