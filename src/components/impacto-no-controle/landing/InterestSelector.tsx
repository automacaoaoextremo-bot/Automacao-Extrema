"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "@/components/impacto-no-controle/icons";

const options = [
  "Rifa / ação com números",
  "Cotas solidárias",
  "Vaquinha",
  "Leilão beneficente",
  "Padrinhos da causa",
  "Doação casada com empresa",
  "Compra direta de itens",
  "Repasse percentual ou valor fixo",
];

const phone = "5519989848246";

export function InterestSelector() {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(option: string) {
    setSelected((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option]);
  }

  const href = useMemo(() => {
    const chosen = selected.length ? selected.join(", ") : "quero entender qual modelo faz mais sentido";
    const message = `Olá! Tenho interesse no Impacto no Controle. Quero conversar sobre: ${chosen}. Podemos avaliar uma ação solidária mobile, com pagamentos, comprovantes, gestão e prestação de contas?`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }, [selected]);

  return (
    <div className="card p-5">
      <h3 className="text-2xl font-black text-[var(--brand-dark)]">Escolha o formato da sua ação</h3>
      <p className="mt-2 text-[var(--muted)]">
        Marque uma ou mais alternativas. A ideia é montar uma campanha que gere confiança, seja simples pelo celular e mostre claramente o impacto da ajuda.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-3 text-sm font-bold text-[var(--brand-dark)]">
            <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <a className="btn-primary mt-5" href={href} target="_blank" rel="noreferrer">
        <MessageCircle className="h-5 w-5" /> Finalizar pelo WhatsApp
      </a>
    </div>
  );
}
