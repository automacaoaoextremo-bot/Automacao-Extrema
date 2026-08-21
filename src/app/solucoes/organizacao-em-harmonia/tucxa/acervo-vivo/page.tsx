import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { AcervoVivoPublicReader } from "@/components/organizacao-em-harmonia/acervo-vivo-public-reader";

export const dynamic = "force-dynamic";

const base = "/solucoes/organizacao-em-harmonia/tucxa";

const actions = [
  { label: "Início", href: "#inicio", variant: "primary" as const },
  { label: "Voltar", href: `${base}/atendimento-em-harmonia?abrir=acessos`, variant: "secondary" as const },
  { label: "Catálogo", href: "#catalogo", variant: "secondary" as const },
  { label: "Trilhas", href: "#trilhas", variant: "secondary" as const },
  { label: "Folha Verde", href: "#folha-verde", variant: "secondary" as const },
  { label: "Ajuda", href: "#duvidas", variant: "secondary" as const, action: "supportWhatsapp" as const },
];

export default function AcervoVivoPublicPage() {
  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={actions} navLabel="Menu público do Acervo Vivo" showSupport={false} />
      <AcervoVivoPublicReader />
    </main>
  );
}
