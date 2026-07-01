const csv = [
  "nome_completo,email,whatsapp,funcao_slug,modulos,ativo,e_cavalinho,entidades,linhas,e_cambono,entidades_cambonadas,cambono_reserva,apoia_recepcao,apoia_organizacao,segunda,terca,quarta,quinta,grupo_quinta,pode_aprovar_eventos,pode_alterar_calendario,pode_ver_relatorios,observacoes_atendimento,observacoes",
  "Maria Exemplo,maria@example.com,19999999999,diretoria,agenda-viva|atendimento-em-harmonia,sim,nao,,,nao,,nao,sim,sim,sim,sim,nao,sim,ambos,sim,sim,sim,Responsável por aprovações,Responsável por aprovações",
  "João Exemplo,joao@example.com,19888888888,cambono,agenda-viva,sim,nao,,,sim,Caboclo Exemplo,sim,nao,sim,sim,nao,nao,sim,grupo-1,nao,nao,nao,Cambono reserva do Grupo 1,Apoio nos atendimentos",
  "Ana Exemplo,ana@example.com,19777777777,cavalinho,agenda-viva,sim,sim,Cabocla Exemplo; Preto Velho Exemplo,Oxóssi; Preto Velho,nao,,nao,nao,nao,sim,sim,nao,sim,grupo-2,nao,nao,nao,Recebe duas entidades,Filha da corrente",
].join("\n");

export async function GET() {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-envolvidos-organizacao-em-harmonia.csv"',
    },
  });
}
