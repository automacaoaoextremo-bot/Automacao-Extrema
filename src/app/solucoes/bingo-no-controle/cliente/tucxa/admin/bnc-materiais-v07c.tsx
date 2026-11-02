"use client";

const guides = [
  { title: "Manual do operador", detail: "Antes de cada rodada, confira evento, cartelas, prêmios confirmados e estado do sorteio.", points: [
    "Confirme data, local, responsável e rodadas liberadas.", "Anuncie claramente as regras de cada rodada antes de iniciar.", "Registre cada pedra uma única vez no painel e mantenha um conferente independente.", "Use a função de desfazer somente com justificativa; nunca altere sorteios históricos.", "Encerre a rodada somente depois de conferir reivindicações pendentes."
  ] },
  { title: "Manual da mesa de conferência", detail: "Orientações para validar cartelas físicas e registrar vencedores.", points: [
    "Verifique o código da cartela, o lote/cor e a rodada autorizada.", "Compare os números marcados com os sorteios válidos registrados.", "Confira a modalidade (quina ou cartela cheia), com duas pessoas quando possível.", "Registre o resultado da reivindicação e a justificativa da conferência.", "Não publique dados pessoais dos participantes."
  ] },
  { title: "Checklist antes do evento", detail: "Conferência prática de estrutura, equipe, comunicação e contingências.", points: [
    "Confirme autorização, horário, espaço, acessibilidade e equipe.", "Defina tipos de cartelas, cores, preço, combos e restrições por rodada.", "Confira lista, valor, foto autorizada e disponibilidade real das prendas.", "Teste conexão, tablets, energia, projeção, microfone e impressora.", "Valide QR Codes, informativos, cardápio, formas de pagamento e plano manual de contingência."
  ] },
  { title: "Roteiro de homologação", detail: "Testes obrigatórios antes de abrir sorteios e vendas reais.", points: [
    "Teste em homologação, nunca com o histórico concluído.", "Valide permissões owner/manager, operator, viewer e usuário não vinculado.", "Crie evento fictício e confira clonagem sem vencedores ou sorteios antigos.", "Teste número duplicado, desfazer última pedra e auditoria.", "Repita verificações após atualização da Vercel e do Supabase."
  ] },
  { title: "Controle financeiro e prestação de contas", detail: "Pontos de controle antes de ativar qualquer operação comercial.", points: [
    "Registre preço e finalidade de cada lote, combo e cartela.", "Defina responsabilidades por caixa, PIX, cartão, cancelamentos e reembolsos.", "Concilie pedidos, comprovantes, valores recebidos, entregas e despesas.", "Mantenha recibos e comprovantes restritos à equipe autorizada.", "Não confunda combos em rascunho com vendas efetuadas."
  ] },
];

export function BncMateriaisV07C() {
  return <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Geral</p>
    <h2 className="text-2xl font-black">Materiais de apoio</h2>
    <p className="mt-2 max-w-3xl text-sm text-slate-600">Orientações internas adaptadas ao TUCXA. Revisar e aprovar com a Diretoria antes de divulgar como normas oficiais.</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">{guides.map(guide => <details key={guide.title} className="rounded-xl border border-emerald-100 p-4 open:bg-emerald-50">
      <summary className="cursor-pointer text-lg font-bold text-[#0c5b3c]">{guide.title} <span className="block text-xs font-medium text-slate-500">Toque para consultar</span></summary>
      <p className="mt-3 text-sm text-slate-600">{guide.detail}</p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">{guide.points.map(point => <li key={point}>{point}</li>)}</ol>
    </details>)}</div>
  </section>;
}
