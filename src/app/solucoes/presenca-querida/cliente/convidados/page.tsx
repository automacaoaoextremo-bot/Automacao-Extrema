import { PresencaBackToDashboard, PresencaClientHeader } from "@/components/presenca-client-header";
import { PresencaContextualHelp } from "@/components/presenca-contextual-help";

const columns = ["Nome", "WhatsApp", "Grupo", "Status", "Adultos", "Crianças", "Acompanhantes", "Observações"];
const sample = [
  ["Ana Paula", "(19) 99999-1111", "Família", "Pendente", "1", "0", "1", "Sem restrição"],
  ["Carlos Roberto", "(19) 99999-2222", "Trabalho", "Confirmado", "1", "0", "0", ""],
  ["Marina e João", "(19) 99999-3333", "Amigos", "Talvez", "2", "1", "0", "Criança de 5 anos"],
];

export default function PresencaConvidadosPage() {
  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <PresencaClientHeader />
      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <PresencaBackToDashboard />
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.36fr]">
          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Lista de convidados</p>
            <h1 className="mt-2 text-3xl font-black text-[#00334E]">Cadastro, grupos e importação</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              O MVP já prevê a tabela <code className="rounded bg-slate-100 px-1">pq_guests</code> com token individual por convidado. A próxima evolução é adicionar importação por planilha com validação de WhatsApp, duplicidade e grupos.
            </p>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-rose-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-rose-50 text-[#00334E]">
                  <tr>{columns.map((column) => <th key={column} className="px-4 py-3 font-black">{column}</th>)}</tr>
                </thead>
                <tbody>
                  {sample.map((row) => (
                    <tr key={row[0]} className="border-t border-rose-100">
                      {row.map((cell, index) => <td key={`${row[0]}-${index}`} className="px-4 py-3 text-slate-700">{cell || "—"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <PresencaContextualHelp title="Validação importante" href="/solucoes/presenca-querida/cliente/confirmacoes" actionLabel="Ver confirmações">
            <p>
              Cada convidado deve ter um link individual. Isso reduz confusão, permite acompanhar status e evita respostas perdidas em conversas paralelas.
            </p>
          </PresencaContextualHelp>
        </div>
      </section>
    </main>
  );
}
