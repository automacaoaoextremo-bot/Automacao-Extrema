import { PresencaClientShell } from "@/components/presenca-client-header";
import { PresencaContextualHelp } from "@/components/presenca-contextual-help";

const reports = [
  "Lista de confirmados para recepção",
  "Adultos, crianças e convidados vinculados para buffet",
  "Pendentes por grupo para lembretes",
  "Convidados com observações ou restrições alimentares",
  "Lista para lembrancinhas, etiquetas e organização de mesas",
  "Resumo pós-evento para case, depoimento e aprendizado",
];

export default function PresencaRelatoriosPage() {
  return (
    <PresencaClientShell>
      <section>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.36fr]">
          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Relatórios</p>
            <h1 className="mt-2 text-3xl font-black text-[#00334E]">Exportações para operação do evento</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Os relatórios transformam confirmações em decisões práticas para comida, bebida, mesas, equipe, lembrancinhas e recepção.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {reports.map((report) => (
                <div key={report} className="rounded-2xl bg-[#fff7f4] p-4 font-bold text-[#00334E] ring-1 ring-rose-100">✓ {report}</div>
              ))}
            </div>
          </div>
          <PresencaContextualHelp title="O que medir no Cliente Fundador" href="/solucoes/presenca-querida/cliente/confirmacoes" actionLabel="Ver confirmações">
            <p>
              Meça taxa de resposta, redução de pendências após lembrete, tempo economizado e tranquilidade percebida pela família ou organizador.
            </p>
          </PresencaContextualHelp>
        </div>
      </section>
    </PresencaClientShell>
  );
}
