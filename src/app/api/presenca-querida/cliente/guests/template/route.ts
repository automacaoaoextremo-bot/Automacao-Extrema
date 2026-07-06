export const dynamic = "force-dynamic";

export async function GET() {
  const csv = [
    "nome,whatsapp,email,grupo,parentesco,origem_relacionamento,convidado_principal,recebe_convite,adultos,criancas,observacao_alimentar,observacoes",
    "Leticia,19999991111,leticia@email.com,Família,Prima,, ,sim,1,0,Sem restrição,Recebe o convite dela e do Gabriel",
    "Gabriel,,,Família,Marido da Leticia,,Leticia,nao,1,0,,Convidado vinculado à Leticia",
    "Marina,19999992222,marina@email.com,Amigos,,Amizade da Daniela,,sim,1,1,,Vai com uma criança cadastrada como parte do convite",
  ].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-convidados-presenca-querida.csv"',
    },
  });
}
