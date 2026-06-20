import Link from "next/link";
import type { CorrenteOnboardingStep } from "@/lib/corrente-em-dia";

type CorrenteOnboardingChecklistProps = {
  steps: CorrenteOnboardingStep[];
  compact?: boolean;
};

export function CorrenteOnboardingChecklist({ steps, compact = false }: CorrenteOnboardingChecklistProps) {
  const completed = steps.filter((step) => step.done).length;
  const total = steps.length || 1;
  const progress = Math.round((completed / total) * 100);

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Configuração inicial</p>
          <h2 className="mt-2 text-2xl font-black text-[#00334E]">Checklist para começar com segurança</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Complete os passos essenciais para o Corrente em Dia funcionar com clareza para a gestão, contribuintes e responsáveis por aprovações.
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-[#00334E]">
          <p className="text-3xl font-black">{progress}%</p>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">concluído</p>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#31C16B]" style={{ width: `${progress}%` }} />
      </div>

      <div className={compact ? "mt-5 grid gap-3" : "mt-5 grid gap-3 lg:grid-cols-2"}>
        {steps.map((step) => (
          <article key={step.key} className="rounded-2xl border border-slate-100 bg-[#f8fbfa] p-4">
            <div className="flex items-start gap-3">
              <span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${step.done ? "bg-[#31C16B] text-[#00334E]" : "bg-white text-slate-400 ring-1 ring-slate-200"}`}>
                {step.done ? "✓" : ""}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-black text-[#00334E]">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                {!compact && <p className="mt-2 text-xs leading-5 text-slate-500"><strong>Por que importa:</strong> {step.why}</p>}
                <Link href={step.href} className="mt-3 inline-flex text-sm font-black text-[#00334E] underline">
                  {step.done ? "Revisar" : "Resolver agora"}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
