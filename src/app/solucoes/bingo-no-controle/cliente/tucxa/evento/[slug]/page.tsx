import type { Metadata } from "next";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { BncPublicEventsV07B } from "../../bnc-public-events-v07b";

export const metadata: Metadata = { title: "Evento do Bingo do TUCXA | Programação e prendas", robots: { index: false } };
export default async function Page({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  return <div className="min-h-dvh bg-[#f5faf5]"><TucxaPublicHeader navLabel="Bingo do TUCXA" showSupport={false}/>
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-8"><h1 className="text-2xl font-black text-[#154b35]">Programação do Bingo</h1><BncPublicEventsV07B slug={slug}/></main>
  </div>;
}
