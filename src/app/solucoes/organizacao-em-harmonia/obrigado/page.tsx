import { OrganizacaoPublicHeader } from "@/components/organizacao-em-harmonia/organizacao-public-header";
import { moduleInfo, normalizeOrganizacaoModulo, organizacaoWhatsappMessage } from "@/lib/organizacao-em-harmonia";

const AE_HELP_WHATSAPP = `https://wa.me/5519989848246?text=${encodeURIComponent(
  "Olá, preciso de ajuda com a Organização em Harmonia.",
)}`;

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
    <main id="inicio" className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <OrganizacaoPublicHeader
        actions={[{ label: "Ajuda", href: AE_HELP_WHATSAPP }]}
        backFallbackHref={info.href}
      />

      <section className="mx-auto max-w-3xl px-2.5 py-1.5 sm:px-4 sm:pb-12 sm:pt-6">
        <div className="rounded-[1.25rem] bg-white p-2.5 shadow-xl ring-1 ring-slate-100 sm:rounded-[2rem] sm:p-8">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#2F6B43] sm:text-sm sm:tracking-[0.28em]">
            Cadastro recebido
          </p>
          <h1 className="mt-0.5 text-[1.4rem] font-black leading-tight text-[#00334E] sm:mt-2 sm:text-5xl">
            Seu interesse já está salvo.
          </h1>
          <p className="mt-1.5 text-[10px] font-semibold leading-4 text-slate-700 sm:mt-3 sm:text-lg sm:leading-8">
            Você deu o primeiro passo para organizar atividades, atendimentos, contribuições e decisões. Agora continue pelo WhatsApp da Automação Extrema para receber as orientações de acesso da Organização em Harmonia.
          </p>

          <div className="mt-2 rounded-xl bg-emerald-50 p-2.5 text-slate-800 ring-1 ring-emerald-100 sm:mt-4 sm:rounded-3xl sm:p-5">
            <p className="text-[11px] font-black text-[#00334E] sm:text-base">Próximo passo recomendado</p>
            <p className="mt-1 text-[9px] font-semibold leading-4 sm:mt-2 sm:text-base sm:leading-7">
              Toque no botão abaixo e envie a mensagem pré-preenchida. Ela já leva nome, WhatsApp, e-mail, código do lead e a validação da Organização em Harmonia para o BotConversa identificar seu cadastro sem pedir tudo de novo.
            </p>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#31C16B] px-3 py-2 text-center text-xs font-black text-[#00334E] shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#43db7c] sm:mt-5 sm:min-h-14 sm:rounded-2xl sm:px-6 sm:py-4 sm:text-base"
          >
            Continuar cadastro pelo WhatsApp
          </a>

          <p className="mt-2 text-[9px] font-semibold leading-4 text-slate-600 sm:mt-5 sm:text-sm sm:leading-6">
            Também enviamos uma confirmação para o e-mail informado{email ? `: ${email}` : ""}. Se não encontrar, confira spam/lixo eletrônico. O WhatsApp será o canal principal para confirmar dados e orientar a validação.
          </p>
        </div>
      </section>
    </main>
  );
}
