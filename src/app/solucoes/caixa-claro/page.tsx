import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CAIXA_CLARO_LOGIN } from "@/lib/caixa-claro";

const pillars = [
  {
    title: "Caixa futuro",
    text: "Veja o saldo de hoje junto com entradas e compromissos dos próximos dias antes de decidir uma nova compra.",
  },
  {
    title: "Renda sem dupla contagem",
    text: "Holerite e INSS registram a renda; PIX entre seus próprios bancos é tratado como transferência e pode ser conciliado.",
  },
  {
    title: "Família com acessos individuais",
    text: "Cada membro entra com seu próprio login e senha, compartilhando a visão familiar com rastreabilidade.",
  },
  {
    title: "Documentos privados",
    text: "Extratos, holerites e comprovantes ficam em storage privado e só entram nos números depois de revisão.",
  },
];

export default function CaixaClaroPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#00334E] text-white">
        <section className="px-4 py-10 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#31C16B]">Automação Extrema</p>
              <Image
                src="/caixa-claro/logo-caixa-claro.svg"
                alt="Caixa Claro"
                width={640}
                height={180}
                className="mt-5 w-full max-w-xl rounded-3xl bg-white p-4"
                priority
              />
              <h1 className="mt-7 text-4xl font-black leading-tight sm:text-5xl">
                Enxergue o caixa futuro antes que o problema apareça.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
                O Caixa Claro organiza movimentos, rendas, documentos e compromissos futuros para transformar dados financeiros em decisões semanais.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href={CAIXA_CLARO_LOGIN} className="rounded-xl bg-[#31C16B] px-6 py-4 text-center font-black text-[#00334E] hover:bg-[#48dc83]">
                  Acessar piloto SilvaMattano
                </Link>
                <Link href="/" className="rounded-xl border border-white/20 px-6 py-4 text-center font-black hover:bg-white/10">
                  Voltar à Automação Extrema
                </Link>
              </div>
            </div>

            <aside className="rounded-3xl bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8CC]">Piloto familiar</p>
              <h2 className="mt-3 text-2xl font-black text-[#00334E]">SilvaMattano</h2>
              <p className="mt-3 leading-7 text-slate-600">
                A primeira versão valida um cenário real: despesas concentradas no BTG, rendas recebidas em bancos diferentes e transferidas por PIX para a conta central da família.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {pillars.map((pillar) => (
                  <article key={pillar.title} className="rounded-2xl bg-slate-50 p-4">
                    <h3 className="font-black text-[#00334E]">{pillar.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{pillar.text}</p>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
