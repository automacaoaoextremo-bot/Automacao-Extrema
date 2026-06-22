export const dynamic = "force-dynamic";

export async function GET() {
  const csv = [
    "nome,whatsapp,email,grupo,parentesco,origem_relacionamento,adultos,criancas,acompanhantes_permitidos,observacao_alimentar,observacoes",
    "Ana Paula,19999991111,ana@email.com,Família,Prima,,1,0,1,Sem restrição,Convidada próxima da família",
    "Marina,19999992222,marina@email.com,Amigos,,Amizade da Daniela,1,1,0,,Vai com uma criança",
  ].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-convidados-presenca-querida.csv"',
    },
  });
}
