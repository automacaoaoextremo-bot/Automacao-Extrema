"use client";

import { FormEvent, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type PaymentMethod = "pix" | "cartao" | "dinheiro";

function initialAnonymous() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("tipo") === "anonima";
}

const headerActions = [
  { label: "Agendar/alterar atendimento", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/login?destino=agenda", variant: "secondary" as const },
  { label: "É novo por aqui", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/novo", variant: "secondary" as const },
  { label: "Site do Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "primary" as const },
];

export default function ContribuicaoConsulentePage() {
  const [anonymous, setAnonymous] = useState(initialAnonymous);
  const [amount, setAmount] = useState("50");
  const [customAmount, setCustomAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [receipt, setReceipt] = useState("");
  const [message, setMessage] = useState("");

  const finalAmount = useMemo(() => (amount === "outro" ? customAmount : amount), [amount, customAmount]);
  const pixCode = useMemo(() => `PIX-TUCXA-CONTRIBUICAO-${anonymous ? "ANONIMA" : "IDENTIFICADA"}-${finalAmount || "VALOR"}`, [anonymous, finalAmount]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Orientação registrada para conferência do Tucxa. Em produção, este fluxo poderá gerar Pix copia e cola, QR Code e link de pagamento online.");
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu de contribuição do consulente" />

      <section className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black tracking-[0.22em] text-[#2F6B43] sm:text-sm">Corrente em Dia</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight text-[#123D2C] sm:text-4xl">Contribua com a manutenção do Tucxa.</h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">
            Escolha se a contribuição será identificada ou anônima, defina o valor e a forma de pagamento. No Pix, o sistema pode exibir copia e cola e QR Code; em cartão ou dinheiro, pode receber comprovante ou solicitar apoio da tesouraria.
          </p>
        </div>

        <form onSubmit={submit} className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
            <h2 className="text-xl font-black text-[#123D2C]">Tipo e valor</h2>

            <div className="mt-4 grid gap-3">
              <label className={`rounded-2xl p-4 ring-1 ${!anonymous ? "bg-[#E9F2E7] ring-[#123D2C]/20" : "bg-white ring-[#123D2C]/10"}`}>
                <span className="flex items-start gap-3">
                  <input type="radio" checked={!anonymous} onChange={() => setAnonymous(false)} className="mt-1 h-5 w-5" />
                  <span>
                    <span className="block font-black text-[#123D2C]">Contribuição identificada</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">Mantém seu nome e contato vinculados à contribuição.</span>
                  </span>
                </span>
              </label>
              <label className={`rounded-2xl p-4 ring-1 ${anonymous ? "bg-[#E9F2E7] ring-[#123D2C]/20" : "bg-white ring-[#123D2C]/10"}`}>
                <span className="flex items-start gap-3">
                  <input type="radio" checked={anonymous} onChange={() => setAnonymous(true)} className="mt-1 h-5 w-5" />
                  <span>
                    <span className="block font-black text-[#123D2C]">Contribuição anônima</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">Não exige login. Informe contato apenas se desejar retorno.</span>
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {["20", "50", "100", "outro"].map((option) => (
                <button key={option} type="button" onClick={() => setAmount(option)} className={`rounded-2xl px-4 py-3 text-sm font-black ring-1 ${amount === option ? "bg-[#123D2C] text-white ring-[#123D2C]" : "bg-white text-[#123D2C] ring-[#123D2C]/10"}`}>
                  {option === "outro" ? "Outro" : `R$ ${option}`}
                </button>
              ))}
            </div>

            {amount === "outro" && (
              <label className="mt-4 grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">Valor desejado</span>
                <input value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} inputMode="decimal" className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]" placeholder="Ex.: 75,00" />
              </label>
            )}
          </div>

          <div className="rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
            <h2 className="text-xl font-black text-[#123D2C]">Forma de pagamento</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["pix", "Pix"],
                ["cartao", "Débito/crédito"],
                ["dinheiro", "Dinheiro"],
              ].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setPaymentMethod(value as PaymentMethod)} className={`rounded-2xl p-4 text-left text-sm font-black ring-1 ${paymentMethod === value ? "bg-[#E9F2E7] text-[#123D2C] ring-[#123D2C]/20" : "bg-white text-slate-600 ring-[#123D2C]/10"}`}>
                  {label}
                </button>
              ))}
            </div>

            {paymentMethod === "pix" && (
              <div className="mt-5 rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <p className="font-black text-[#123D2C]">Pix copia e cola</p>
                <p className="mt-2 break-all rounded-2xl bg-white p-3 text-xs font-bold text-slate-700 ring-1 ring-[#123D2C]/10">{pixCode}</p>
                <div className="mt-3 flex h-36 items-center justify-center rounded-3xl bg-white text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                  QR Code do Pix
                </div>
              </div>
            )}

            {paymentMethod === "cartao" && (
              <div className="mt-5 rounded-3xl bg-[#F7FAF2] p-4 text-sm leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
                <p className="font-black">Débito ou crédito</p>
                <p className="mt-2">Você poderá fazer upload do comprovante ou solicitar um link de pagamento online, conforme a configuração do Tucxa.</p>
              </div>
            )}

            {paymentMethod === "dinheiro" && (
              <div className="mt-5 rounded-3xl bg-[#F7FAF2] p-4 text-sm leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
                <p className="font-black">Dinheiro</p>
                <p className="mt-2">Faça upload do recibo/comprovante ou solicite que a pessoa do Tucxa que recebeu o valor registre o recebimento.</p>
              </div>
            )}

            <label className="mt-5 grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Comprovante ou observação</span>
              <input value={receipt} onChange={(event) => setReceipt(event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]" placeholder="Link, código ou observação do comprovante" />
            </label>

            {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

            <button className="mt-5 w-full rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5">
              Registrar contribuição
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
