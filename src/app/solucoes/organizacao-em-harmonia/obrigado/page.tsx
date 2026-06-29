import Link from "next/link";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { moduleInfo, normalizeOrganizacaoModulo, organizacaoWhatsappMessage } from "@/lib/organizacao-em-harmonia";

function asParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function whatsappLink(input: { module: ReturnType<typeof normalizeOrganizacaoModulo>; name: string; email: string; whatsapp: string; leadId: string }) {
  const aeWhatsapp = (process.env.NEXT_PUBLIC_AE_WHATSAPP_NUMBER || "5519989848246").replace(/\D/g, "");
  const message = organizacaoWhatsappMessage({
    module: input.module,
    contactName: input.name,
    email: input.email,
    whatsapp: input.whatsapp,
    leadId: input.leadId,
  });

  return `https://wa.me/${aeWhatsapp}?text=${encodeURIComponent(message)}`;
}

export default async function OrganizacaoObrigadoPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const selectedModule = normalizeOrganizacaoModulo(asParam(params.modulo));
  const info = moduleInfo(selectedModule);
  const name = asParam(params.nome);
  const email = asParam(params.email);
  const whatsapp = asParam(params.whatsapp);
  const leadId = asParam(params.leadId);
  const waUrl = whatsappLink({ module: selectedModule, name, email, whatsapp, leadId });

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Organização em Harmonia"
        logoSrc="/organizacao-em-harmonia-logo.svg"
        logoAlt="Logo Organização em Harmonia"
        actions={[]}
        sectionLinks={[]}
        homeHref="/solucoes/organizacao-em-harmonia"
        topAction={
          <Link
            href={info.href}
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
            Seu interesse já está salvo.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
            Você deu o primeiro passo para tirar atividades, atendimentos, contribuições e decisões soltas da memória da organização. Agora continue pelo WhatsApp da Automação Extrema para manter o atendimento salvo no celular e validar os próximos passos da {info.name}.
          </p>

          <div className="mt-4 rounded-3xl bg-emerald-50 p-5 text-slate-800">
            <p className="font-black text-[#00334E]">Próximo passo recomendado</p>
            <p className="mt-2 leading-7">
              Toque no botão abaixo e envie a mensagem pré-preenchida. Ela já leva nome, WhatsApp, e-mail, código do lead e solução de interesse para o BotConversa identificar seu cadastro sem pedir tudo de novo.
            </p>
          </div>

          <div className="mt-5">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#31C16B] px-6 py-4 text-center text-base font-black text-[#00334E] shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
            >
              Continuar pelo WhatsApp
            </a>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-600">
            Também enviamos uma confirmação para o e-mail informado{email ? `: ${email}` : ""}. Se não encontrar, confira spam/lixo eletrônico. O WhatsApp será o canal principal para confirmar dados, tirar dúvidas e orientar a validação.
          </p>
        </div>
      </section>
    </main>
  );
}
