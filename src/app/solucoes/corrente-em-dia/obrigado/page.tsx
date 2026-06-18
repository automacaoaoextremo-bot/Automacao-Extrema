import Link from "next/link";
import { AeSolutionHeader } from "@/components/ae-solution-header";

function asParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function whatsappLink(input: { name: string; email: string; whatsapp: string; leadId: string }) {
  const aeWhatsapp = (process.env.NEXT_PUBLIC_AE_WHATSAPP_NUMBER || "5519989848246").replace(/\D/g, "");
  const message = [
    "Olá! Preenchi o Quero Conhecer do Corrente em Dia e quero continuar meu cadastro pelo WhatsApp.",
    "",
    input.name ? `Nome do contato: ${input.name}` : "",
    input.email ? `E-mail: ${input.email}` : "",
    input.whatsapp ? `WhatsApp: ${input.whatsapp}` : "",
    input.leadId ? `Código do lead: ${input.leadId}` : "",
    "",
    "Quero receber as orientações de acesso e seguir com a avaliação como Cliente Fundador.",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${aeWhatsapp}?text=${encodeURIComponent(message)}`;
}

export default async function CorrenteEmDiaObrigadoPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const name = asParam(params.nome);
  const email = asParam(params.email);
  const whatsapp = asParam(params.whatsapp);
  const leadId = asParam(params.leadId);
  const waUrl = whatsappLink({ name, email, whatsapp, leadId });

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Corrente em Dia"
        logoSrc="/corrente-em-dia-logo.svg"
        logoAlt="Logo Corrente em Dia"
        actions={[]}
        sectionLinks={[]}
        topAction={
          <Link
            href="/solucoes/corrente-em-dia"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#31C16B]/30 bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] shadow-md shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
          >
            ← Voltar
          </Link>
        }
      />

      <section className="mx-auto max-w-3xl px-4 pb-8 pt-3 sm:pb-12 sm:pt-6">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-100 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43] sm:text-sm">Cadastro recebido</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#00334E] sm:text-5xl">
            Seu primeiro acesso está sendo preparado.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
            Você já iniciou o processo para organizar contribuições, comprovantes e pendências com mais clareza e tranquilidade. Agora continue pelo WhatsApp da Automação Extrema para receber as orientações de acesso e iniciar a avaliação como Cliente Fundador.
          </p>

          <div className="mt-4 rounded-3xl bg-emerald-50 p-5 text-slate-800">
            <p className="font-black text-[#00334E]">Próximo passo</p>
            <p className="mt-2 leading-7">
              Toque no botão abaixo e envie a mensagem pré-preenchida. Ela já leva nome, WhatsApp, e-mail e código do lead para o BotConversa identificar seu cadastro sem pedir tudo de novo.
            </p>
          </div>

          <div className="mt-5">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#31C16B] px-6 py-4 text-center text-base font-black text-[#00334E] shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
            >
              Continuar seu cadastro pelo WhatsApp
            </a>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-600">
            As orientações também foram preparadas para o e-mail informado{email ? `: ${email}` : ""}. Mesmo assim, o WhatsApp será o canal principal para confirmar seus dados, tirar dúvidas e acompanhar os próximos passos.
          </p>
        </div>
      </section>
    </main>
  );
}
