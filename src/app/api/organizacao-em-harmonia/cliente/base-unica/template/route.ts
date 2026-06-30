const csv = [
  "nome_completo,email,whatsapp,funcao_slug,modulos,ativo,observacoes",
  "Maria Exemplo,maria@example.com,19999999999,diretoria,agenda-viva|atendimento-em-harmonia,sim,Responsável por aprovações",
  "João Exemplo,joao@example.com,19888888888,cambono,agenda-viva,sim,Apoio nos atendimentos",
].join("\n");

export async function GET() {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-envolvidos-organizacao-em-harmonia.csv"',
    },
  });
}
