import { PresencaClientShell } from "@/components/presenca-client-header";
import { PresencaContextualHelp } from "@/components/presenca-contextual-help";

const cards = [
  ["Confirmados", "Convidados que já responderam sim, com ou sem acompanhantes."],
  ["Talvez", "Pessoas que precisam de acompanhamento antes da decisão final."],
  ["Pendentes", "Convidados que ainda não responderam e podem receber lembrete carinhoso."],
  ["Não poderão ir", "Respostas negativas registradas para melhorar a previsão real."],
];

export default function PresencaConfirmacoesPage() {
  return (
    <PresencaClientShell>
      <section>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.36fr]">
          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Confirmações</p>
            <h1 className="mt-2 text-3xl font-black text-[#00334E]">Status por convidado e próximos lembretes</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Esta área consolida as respostas que hoje ficam espalhadas em áudios, emojis e mensagens no WhatsApp. O objetivo é orientar a próxima ação sem constrangimento.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {cards.map(([title, text]) => (
                <article key={title} className="rounded-2xl bg-[#fff7f4] p-5 ring-1 ring-rose-100">
                  <h2 className="text-xl font-black text-[#00334E]">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
          <PresencaContextualHelp title="Lembrete não é cobrança" href="/solucoes/presenca-querida/cliente/mensagens" actionLabel="Ajustar mensagem">
            <p>
              O lembrete deve ser educado e contextualizado: a pessoa ajuda na organização do evento, sem sentir pressão ou exposição.
            </p>
          </PresencaContextualHelp>
        </div>
      </section>
    </PresencaClientShell>
  );
}
