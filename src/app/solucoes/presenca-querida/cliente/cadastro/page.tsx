import { PresencaBackToDashboard, PresencaClientHeader } from "@/components/presenca-client-header";
import { PresencaContextualHelp } from "@/components/presenca-contextual-help";

const fields = [
  "Nome do evento e anfitrião",
  "Tipo de evento e modo festa surpresa",
  "Data, horário, local, endereço e cidade",
  "Headline pública e texto do convite",
  "Traje, estacionamento e orientações finais",
  "Mensagem de privacidade e remoção de dados pós-evento",
];

export default function PresencaCadastroPage() {
  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <PresencaClientHeader />
      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <PresencaBackToDashboard />
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.36fr]">
          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Cadastro do evento</p>
            <h1 className="mt-2 text-3xl font-black text-[#00334E]">Dados mínimos para publicar o convite</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Esta tela prepara a configuração do evento. Na próxima evolução, os campos serão editáveis e salvos diretamente em <code className="rounded bg-slate-100 px-1">pq_events</code>.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {fields.map((field) => (
                <div key={field} className="rounded-2xl bg-[#fff7f4] p-4 font-bold text-[#00334E] ring-1 ring-rose-100">✓ {field}</div>
              ))}
            </div>
          </div>
          <PresencaContextualHelp title="Diferencial Oceano Azul" href="/solucoes/presenca-querida/cliente/mensagens" actionLabel="Preparar mensagens">
            <p>
              Não trate como cadastro frio de evento. O texto precisa preservar carinho, contexto e privacidade, principalmente em festa surpresa, bodas e aniversários marcantes.
            </p>
          </PresencaContextualHelp>
        </div>
      </section>
    </main>
  );
}
