"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const contributionValues = [30, 50, 80, 100, 150];
const aeWhatsapp = "5519989848246";

function whatsappUrl(value: number | null, note: string) {
  const message = [
    "Olá! Vim do módulo Corrente em Dia do Tucxa.",
    "",
    value ? `Quero orientação para uma contribuição de R$ ${value.toFixed(2).replace(".", ",")}.` : "Quero orientação para fazer uma contribuição.",
    note ? `Observação: ${note}` : "",
    "",
    "Pode me orientar sobre Pix, comprovante e conferência?",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${aeWhatsapp}?text=${encodeURIComponent(message)}`;
}

export default function CorrenteEmDiaFilhoDaCorrentePage() {
  const [selectedValue, setSelectedValue] = useState<number | null>(50);
  const [customValue, setCustomValue] = useState("");
  const [note, setNote] = useState("");

  const finalValue = useMemo(() => {
    const numberValue = Number(customValue.replace(".", "").replace(",", "."));
    if (Number.isFinite(numberValue) && numberValue > 0) return numberValue;
    return selectedValue;
  }, [customValue, selectedValue]);

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Painel", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel", variant: "primary" },
          { label: "Site Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" },
        ]}
        navLabel="Corrente em Dia dos Filhos da Corrente"
      />

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Corrente em Dia</p>
          <h1 className="mt-2 text-3xl font-black text-[#123D2C]">Contribuição do Filho da Corrente</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-700">
            Este espaço concentra a orientação para contribuição mensal, pontual ou de apoio à casa. A conferência final continua com a organização/tesouraria do Tucxa.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[1.75rem] bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <h2 className="text-xl font-black text-[#123D2C]">Escolha uma opção</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {contributionValues.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSelectedValue(value);
                      setCustomValue("");
                    }}
                    className={`rounded-2xl px-4 py-3 font-black shadow ring-1 transition ${selectedValue === value && !customValue ? "bg-[#123D2C] text-white ring-[#123D2C]" : "bg-white text-[#123D2C] ring-[#123D2C]/10"}`}
                  >
                    R$ {value}
                  </button>
                ))}
              </div>

              <label className="mt-4 grid gap-2 text-sm font-black text-[#123D2C]">
                Outro valor
                <input
                  value={customValue}
                  onChange={(event) => setCustomValue(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
                  placeholder="Ex.: 120,00"
                  inputMode="decimal"
                />
              </label>

              <label className="mt-4 grid gap-2 text-sm font-black text-[#123D2C]">
                Observação opcional
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
                  placeholder="Ex.: contribuição mensal, campanha, reforma, evento ou outra orientação."
                />
              </label>

              <a href={whatsappUrl(finalValue, note)} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full justify-center rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white shadow-lg shadow-green-900/10">
                Pedir orientação para contribuir
              </a>
            </section>

            <section className="grid gap-4">
              <article className="rounded-[1.75rem] bg-[#123D2C] p-5 text-white">
                <h2 className="text-xl font-black">Resumo</h2>
                <p className="mt-3 text-4xl font-black">{finalValue ? `R$ ${finalValue.toFixed(2).replace(".", ",")}` : "Valor a definir"}</p>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#CFE2C7]">Ao clicar, abriremos o WhatsApp para orientar Pix, identificação e envio de comprovante quando necessário.</p>
              </article>
              <article className="rounded-[1.75rem] bg-[#E9F2E7] p-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">
                <h2 className="text-xl font-black">Como usar</h2>
                <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6">
                  <li>• Escolha um valor sugerido ou informe outro valor.</li>
                  <li>• Informe se é mensal, pontual, campanha ou apoio a evento.</li>
                  <li>• Aguarde a orientação de pagamento e conferência.</li>
                  <li>• Guarde o comprovante até a confirmação da tesouraria.</li>
                </ul>
              </article>
            </section>
          </div>

          <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel" className="mt-6 inline-flex rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white">Voltar ao painel</Link>
        </div>
      </section>
    </main>
  );
}
