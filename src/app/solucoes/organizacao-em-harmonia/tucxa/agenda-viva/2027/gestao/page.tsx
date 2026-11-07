import { TucxaAgenda2027Client } from "@/components/organizacao-em-harmonia/tucxa-agenda-2027-client";

export const metadata = { title: "Gestão do Calendário Anual 2027 | TUCXA", robots: { index: false, follow: false } };

export default function Page() {
  return <TucxaAgenda2027Client management />;
}
