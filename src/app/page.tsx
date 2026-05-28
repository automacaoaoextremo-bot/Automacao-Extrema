import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#00334E] text-white">
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-6 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pb-24 md:pt-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#31C16B]">
              Diagnóstico de dores e oportunidades
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
              Tecnologia só faz sentido quando resolve uma dor real.
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-white/85">
              A Automação Extrema ajuda pessoas, profissionais, comunidades e negócios a identificarem perdas de tempo,
              retrabalho, falta de controle e oportunidades de melhoria antes de investir em qualquer sistema.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/diagnostico"
                className="rounded-xl bg-[#31C16B] px-6 py-4 text-center font-bold text-[#00334E] shadow-lg hover:bg-[#4ce184]"
              >
                Fazer diagnóstico gratuito
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-white/10 p-6 shadow-2xl ring-1 ring-white/10">
            <Image
              src="/ae-logo-azul.png"
              alt="Automação Extrema"
              width={420}
              height={420}
              className="mx-auto h-auto w-full max-w-sm rounded-2xl object-contain"
              priority
            />
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              {[
                "Não solicita senha",
                "Não solicita cartão",
                "Não instala nada",
                "Não realiza pagamento",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/10 p-3 text-white/90">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
