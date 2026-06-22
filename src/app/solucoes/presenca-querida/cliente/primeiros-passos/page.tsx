import { PresencaClientShell } from "@/components/presenca-client-header";
import { PresencaContextualHelp } from "@/components/presenca-contextual-help";

const steps = [
  ["1", "Completar dados do evento", "Nome, anfitrião, data, horário, local, cidade, modo surpresa e orientações."],
  ["2", "Preparar a lista", "Separar convidados por família, amigos, trabalho, grupo espiritual e convidados especiais."],
  ["3", "Criar mensagens por fase", "Save the Date, convite oficial, lembrete carinhoso, orientação final e agradecimento."],
  ["4", "Testar confirmação", "Abrir um link individual de teste e conferir se o painel atualiza corretamente."],
  ["5", "Enviar com cuidado", "Começar por grupo menor, medir respostas e ajustar texto antes de enviar para todos."],
  ["6", "Fechar operação", "Exportar confirmados, adultos, crianças, acompanhantes e pendentes para buffet/recepção."],
];

export default function PresencaPrimeirosPassosPage() {
  return (
    <PresencaClientShell>
      <section>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.36fr]">
          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Implantação guiada</p>
            <h1 className="mt-2 text-3xl font-black text-[#00334E]">Primeiros passos do Presença Querida</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              O objetivo do MVP é validar uma jornada completa: convidar com carinho, confirmar com clareza, reduzir pendências e gerar previsibilidade para a organização do evento.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {steps.map(([number, title, text]) => (
                <article key={title} className="rounded-2xl bg-[#fff7f4] p-4 ring-1 ring-rose-100">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#00334E] text-sm font-black text-white">{number}</span>
                  <h2 className="mt-3 font-black text-[#00334E]">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
          <PresencaContextualHelp title="Comece menor para validar melhor" href="/solucoes/presenca-querida/cliente/convidados" actionLabel="Ir para convidados">
            <p>
              Para o primeiro evento, cadastre um grupo piloto de convidados fictícios ou próximos. Valide convite, confirmação e painel antes de liberar o envio geral.
            </p>
          </PresencaContextualHelp>
        </div>
      </section>
    </PresencaClientShell>
  );
}
