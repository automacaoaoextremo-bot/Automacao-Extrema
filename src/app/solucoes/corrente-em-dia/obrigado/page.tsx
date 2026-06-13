import Link from "next/link";
import { AeSolutionHeader } from "@/components/ae-solution-header";

function asParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function whatsappLink(input: { name: string; email: string; whatsapp: string; leadId: string }) {
  const message = [
    "Olá! Preenchi o Quero Conhecer do Corrente em Dia e quero receber ajuda para iniciar meu acesso.",
    "",
    input.name ? `Nome do contato: ${input.name}` : "",
    input.email ? `E-mail: ${input.email}` : "",
    input.whatsapp ? `WhatsApp: ${input.whatsapp}` : "",
    input.leadId ? `Código do lead: ${input.leadId}` : "",
    "",
    "Quero seguir com a avaliação como Cliente Fundador.",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/5519992360856?text=${encodeURIComponent(message)}`;
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

      <section className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-100 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Cadastro recebido</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-[#00334E]">Seu primeiro acesso já está sendo preparado.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            Você deu o primeiro passo para tirar contribuições, comprovantes e pendências dos controles soltos e trazer mais clareza, previsibilidade e tranquilidade para quem cuida da organização.
          </p>

          <div className="mt-6 rounded-3xl bg-emerald-50 p-5 text-slate-800">
            <p className="font-black text-[#00334E]">Próximo passo recomendado</p>
            <p className="mt-2 leading-7">
              Clique no botão abaixo para abrir o WhatsApp da Automação Extrema. Assim, o atendimento fica salvo no celular e fica mais fácil confirmar o acesso, tirar dúvidas e iniciar a avaliação como Cliente Fundador.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#31C16B] px-6 py-4 text-center text-base font-black text-[#00334E] shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
            >
              Abrir WhatsApp da AE
            </a>
            <Link
              href="/solucoes/corrente-em-dia/login"
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center text-base font-black text-[#00334E] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Ir para o login
            </Link>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-600">
            Também enviamos as informações de acesso para o e-mail informado{email ? `: ${email}` : ""}. Se não encontrar a mensagem, confira spam/lixo eletrônico.
          </p>
        </div>
      </section>
    </main>
  );
}
