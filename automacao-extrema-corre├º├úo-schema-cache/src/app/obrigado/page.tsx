import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default async function ObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<{ solucao?: string; score?: string }>;
}) {
  const params = await searchParams;
  const solucao = params.solucao ?? "uma solução da Automação Extrema";

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#00334E] px-4 py-10 text-white">
        <section className="mx-auto max-w-2xl rounded-3xl bg-white/10 p-8 shadow-xl ring-1 ring-white/10">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#31C16B]">Diagnóstico recebido</p>
          <h1 className="mt-3 text-3xl font-bold">Obrigado pelas respostas.</h1>
          <p className="mt-4 text-white/85">Pelo que você respondeu, a oportunidade mais próxima parece estar relacionada a:</p>
          <div className="mt-6 rounded-2xl bg-[#31C16B] p-5 text-[#00334E]">
            <p className="text-2xl font-bold">{solucao}</p>
          </div>
          <p className="mt-6 text-white/85">
            A Automação Extrema poderá analisar suas respostas e devolver uma sugestão prática de melhoria,
            automação ou próximo passo. Caso tenha autorizado contato, o retorno poderá acontecer por e-mail ou WhatsApp.
          </p>
          <Link href="/diagnostico" className="mt-8 inline-block rounded-xl bg-white px-5 py-3 font-bold text-[#00334E]">
            Fazer novo diagnóstico
          </Link>
        </section>
      </main>
    </>
  );
}
