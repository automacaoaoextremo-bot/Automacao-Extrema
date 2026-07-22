import type { Metadata } from "next";

const canonicalUrl = "https://www.automacaoextrema.com/solucoes/organizacao-em-harmonia/tucxa";

export const metadata: Metadata = {
  title: "Tucxa em Harmonia",
  description: null,
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: "Tucxa em Harmonia",
    description: "",
    siteName: "Tucxa em Harmonia",
    type: "website",
    url: canonicalUrl,
  },
  twitter: {
    card: "summary",
    title: "Tucxa em Harmonia",
    description: "",
  },
};

export default function TucxaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
