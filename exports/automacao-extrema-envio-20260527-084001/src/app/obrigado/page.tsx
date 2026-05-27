import Link from "next/link";

export default async function ObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<{ solucao?: string; score?: string }>;
}) {
  const params = await searchParams;
  const solucao = params.solucao ?? "uma soluÃ§Ã£o da AutomaÃ§Ã£o Extrema";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-2xl rounded-3xl bg-white/10 p-8 shadow-xl ring-1 ring-white/10">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
          DiagnÃ³stico recebido
        </p>

        <h1 className="mt-3 text-3xl font-bold">Obrigado pelas respostas.</h1>

        <p className="mt-4 text-slate-200">
          Pelo que vocÃª respondeu, a oportunidade mais prÃ³xima parece estar relacionada a:
        </p>

        <div className="mt-6 rounded-2xl bg-cyan-400 p-5 text-slate-950">
          <p className="text-2xl font-bold">{solucao}</p>
        </div>

        <p className="mt-6 text-slate-200">
          A AutomaÃ§Ã£o Extrema poderÃ¡ analisar suas respostas e devolver uma sugestÃ£o prÃ¡tica
          de melhoria, automaÃ§Ã£o ou prÃ³ximo passo.
        </p>

        <Link href="/diagnostico" className="mt-8 inline-block rounded-xl bg-white px-5 py-3 font-bold text-slate-950">
          Fazer novo diagnÃ³stico
        </Link>
      </section>
    </main>
  );
}
