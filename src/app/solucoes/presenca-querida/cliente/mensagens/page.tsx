import { PresencaBackToDashboard, PresencaClientHeader } from "@/components/presenca-client-header";
import { PresencaContextualHelp } from "@/components/presenca-contextual-help";

const messages = [
  {
    title: "Save the Date",
    text: "Reserve essa data com carinho. Em breve enviaremos o convite oficial com todos os detalhes.",
  },
  {
    title: "Convite oficial",
    text: "Sua presença é muito importante para celebrar esse momento. Confirme pelo link para nos ajudar na organização.",
  },
  {
    title: "Lembrete carinhoso",
    text: "Passando só para lembrar do convite. Quando puder, confirme sua presença pelo link para organizarmos tudo com cuidado.",
  },
  {
    title: "Orientação final",
    text: "Está chegando! Seguem horário, endereço, traje, estacionamento e observações para chegar com tranquilidade.",
  },
  {
    title: "Agradecimento pós-evento",
    text: "Foi muito especial ter você com a gente. Obrigado por fazer parte dessa memória querida.",
  },
];

export default function PresencaMensagensPage() {
  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <PresencaClientHeader />
      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <PresencaBackToDashboard />
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.36fr]">
          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Mensagens por fase</p>
            <h1 className="mt-2 text-3xl font-black text-[#00334E]">Comunicação que confirma sem parecer cobrança</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              O motor de mensagens deve permitir variações por grupo, tom e fase do evento. Estes modelos servem como base inicial para validar a jornada.
            </p>
            <div className="mt-6 grid gap-3">
              {messages.map((message) => (
                <article key={message.title} className="rounded-2xl bg-[#fff7f4] p-4 ring-1 ring-rose-100">
                  <h2 className="font-black text-[#00334E]">{message.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{message.text}</p>
                </article>
              ))}
            </div>
          </div>
          <PresencaContextualHelp title="Tom humano primeiro" href="/solucoes/presenca-querida/cliente/convidados" actionLabel="Revisar grupos">
            <p>
              Família, amigos, trabalho e convidados especiais podem receber mensagens com o mesmo objetivo, mas com tom diferente. Esse é um dos diferenciais contra RSVP genérico.
            </p>
          </PresencaContextualHelp>
        </div>
      </section>
    </main>
  );
}
