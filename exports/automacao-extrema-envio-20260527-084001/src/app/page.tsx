import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto flex max-w-4xl flex-col items-start justify-center py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
          AutomaÃ§Ã£o Extrema
        </p>

        <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-6xl">
          Tecnologia sÃ³ faz sentido quando resolve uma dor real.
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-200">
          FaÃ§a um diagnÃ³stico rÃ¡pido para descobrir onde vocÃª, sua famÃ­lia, seu projeto
          ou seu negÃ³cio podem economizar tempo, reduzir retrabalho e organizar melhor
          as oportunidades.
        </p>

        <Link
          href="/diagnostico"
          className="mt-8 rounded-xl bg-cyan-400 px-6 py-4 font-bold text-slate-950 hover:bg-cyan-300"
        >
          Fazer diagnÃ³stico gratuito
        </Link>
      </section>
    </main>
  );
}
