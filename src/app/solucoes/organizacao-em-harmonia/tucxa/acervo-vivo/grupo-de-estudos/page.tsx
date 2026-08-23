import Image from "next/image";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const ACERVO = "/solucoes/organizacao-em-harmonia/tucxa/acervo-vivo";
const WHATSAPP = "https://chat.whatsapp.com/GPiB2S7syr7E5F23j9MtLw?mode=gi_t";

const actions = [
  { label: "Início", href: "#inicio", variant: "primary" as const },
  { label: "Voltar", href: ACERVO, variant: "secondary" as const },
  { label: "Ajuda", href: "#ajuda", variant: "secondary" as const, action: "supportWhatsapp" as const },
];

export default function GrupoDeEstudosPage() {
  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={actions}
        navLabel="Menu do Grupo de Estudos do Tucxa"
        showSupport={false}
        showSessionName
        mobileActionColumns={3}
        compactMobileActions
      />

      <section className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <div className="grid gap-3 rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl shadow-green-900/10 sm:grid-cols-[180px_1fr] sm:p-6">
          <Image
            src="/organizacao-em-harmonia/tucxa/acervo-vivo/grupo-de-estudos.jpg"
            alt="Grupo de Estudos Tucxa 2026"
            width={640}
            height={640}
            className="mx-auto aspect-square w-full max-w-44 rounded-2xl object-cover shadow"
            priority
          />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#CFE2C7]">
              Acervo Vivo • conhecimento compartilhado
            </p>
            <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">Grupo de Estudos Tucxa</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#EEF7EA]">
              Grupo criado com a intenção de estudar temas sobre a espiritualidade, para além do Tucxa.
            </p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-[#123D2C] transition hover:bg-[#E9F2E7]"
            >
              Participar do grupo no WhatsApp
            </a>
          </div>
        </div>

        <section className="mt-3 rounded-[1.75rem] bg-white p-4 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
            Grupo de Estudos no Acervo Vivo
          </p>
          <h2 className="mt-1 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl">
            Um ponto de encontro para estudar, refletir e manter o conhecimento acessível.
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            Use o grupo do WhatsApp para acompanhar a organização dos encontros e consulte o Acervo Vivo sempre que quiser encontrar livros, trilhas e materiais relacionados aos estudos.
          </p>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block rounded-2xl bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white"
          >
            Entrar no Grupo de Estudos
          </a>
        </section>
      </section>
    </main>
  );
}
