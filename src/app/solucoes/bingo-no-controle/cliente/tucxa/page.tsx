import type { Metadata } from "next";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { BingoTucxaHome } from "./bingo-tucxa-home";

const donationPhone = "5519989045150";
const donationText =
  "Olá! Gostaria de doar uma prenda para o próximo Bingo do TUCXA. Como posso colaborar?";
const donationHref = `https://wa.me/${donationPhone}?text=${encodeURIComponent(donationText)}`;

export const metadata: Metadata = {
  title: "Bingo do TUCXA | Estar junto faz bem",
  description:
    "Um encontro de alegria, convivência e apoio às atividades do TUCXA. Participe e saiba como doar uma prenda.",
};

export default function BingoTucxaPage() {
  return (
    <div className="min-h-dvh bg-[#f6faf5] text-[#153d2d]">
      <TucxaPublicHeader
        navLabel="Bingo do TUCXA"
        showSupport={false}
        topAction={
          <a
            href={donationHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Doar uma prenda para o Bingo do TUCXA pelo WhatsApp"
            className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full bg-[#154b35] px-3 py-2 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-[#236945] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#154b35] sm:px-5 sm:text-sm"
          >
            Doar prenda <span aria-hidden="true" className="ml-1">↗</span>
          </a>
        }
      />
      <BingoTucxaHome donationHref={donationHref} />
    </div>
  );
}
