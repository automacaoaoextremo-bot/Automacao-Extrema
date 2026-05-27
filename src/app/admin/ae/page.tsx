import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminAEPage({
  searchParams,
}: {
  searchParams: Promise<{ senha?: string }>;
}) {
  const params = await searchParams;
  const senha = params.senha;

  if (!process.env.ADMIN_PASSWORD || senha !== process.env.ADMIN_PASSWORD) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <section className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">Admin AE</h1>
          <p className="mt-3 text-slate-600">
            Informe a senha na URL para acessar.
          </p>
          <p className="mt-3 rounded bg-slate-100 p-3 font-mono text-sm">
            /admin/ae?senha=SUA_SENHA
          </p>
        </section>
      </main>
    );
  }

  const [{ data: leads }, { data: solutions }] = await Promise.all([
    supabaseAdmin
      .from("ae_leads")
      .select("id, full_name, whatsapp, email, profile_type, main_area, main_pain, urgency, diagnostic_score, status, created_at, recommended_solution_id, ae_solutions(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("ae_solutions")
      .select("id, name, current_status, stage, priority, main_pains, source_file")
      .order("priority", { ascending: false }),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Painel AutomaÃ§Ã£o Extrema</h1>
          <p className="text-slate-600">
            Leads, diagnÃ³sticos e soluÃ§Ãµes em validaÃ§Ã£o.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold">SoluÃ§Ãµes cadastradas</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">SoluÃ§Ã£o</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Etapa</th>
                  <th className="p-2">Prioridade</th>
                  <th className="p-2">Fonte</th>
                </tr>
              </thead>
              <tbody>
                {(solutions ?? []).map((solution) => (
                  <tr key={solution.id} className="border-b align-top">
                    <td className="p-2 font-semibold">{solution.name}</td>
                    <td className="p-2">{solution.current_status}</td>
                    <td className="p-2">{solution.stage}</td>
                    <td className="p-2">{solution.priority}</td>
                    <td className="p-2">{solution.source_file}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold">Ãšltimos diagnÃ³sticos</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Lead</th>
                  <th className="p-2">Contato</th>
                  <th className="p-2">Ãrea</th>
                  <th className="p-2">Dor</th>
                  <th className="p-2">UrgÃªncia</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(leads ?? []).map((lead) => (
                  <tr key={lead.id} className="border-b align-top">
                    <td className="p-2">
                      <strong>{lead.full_name || "Sem nome"}</strong>
                      <br />
                      <span className="text-xs text-slate-500">
                        {new Date(lead.created_at).toLocaleString("pt-BR")}
                      </span>
                    </td>
                    <td className="p-2">
                      {lead.whatsapp}
                      <br />
                      <span className="text-xs text-slate-500">{lead.email}</span>
                    </td>
                    <td className="p-2">{lead.main_area}</td>
                    <td className="p-2">{lead.main_pain}</td>
                    <td className="p-2">{lead.urgency}</td>
                    <td className="p-2 font-bold">{lead.diagnostic_score}</td>
                    <td className="p-2">{lead.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
