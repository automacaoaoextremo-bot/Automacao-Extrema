# Tucxa — Acervo Vivo — Ajustes 04

## Branch de destino

`feature/tucxa-acervo-vivo-ajustes-01`

## Base recebida

- Branch: `feature/tucxa-acervo-vivo-ajustes-01`
- Commit: `9c53014e214aee53c3e93121d9e4328e57a98d53`
- Working tree informada no pacote: limpa

## Escopo implementado

1. O primeiro quadro verde da página pública do Acervo Vivo volta a mostrar, também no mobile, o texto completo:

   > Encontre livros, materiais da Casa, trilhas de estudo, o Clube do Livro e o Grupo de Estudos. O Acervo Vivo reúne caminhos para estudar, trocar experiências e continuar aprendendo; você só precisa se identificar quando decidir reservar ou emprestar.

2. O restante da estrutura principal é preservado, exceto pelo item explicitamente solicitado abaixo.

3. O botão/card `Trilhas` redundante foi removido da linha de acessos rápidos. Permanecem `Descobrir` e `Meus livros`. O quadro específico `Não sabe por onde começar? / Conheça as Trilhas / ABRIR` continua sendo o acesso às Trilhas.

4. O tutorial/pop-up inicial deixa de reabrir quando a pessoa sai da página do Acervo pelos cards `Clube do Livro` ou `Grupo de Estudos` e depois retorna no mesmo navegador/aba, inclusive pelo botão `Voltar` dessas páginas ou pelo voltar do navegador.

   A solução usa `sessionStorage` apenas como marcador temporário de navegação interna. O marcador é consumido ao retornar ao Acervo e não altera a preferência persistente do tutorial.

5. Uma visita realmente nova ao endereço do Acervo continua obedecendo à regra normal do tutorial e à preferência `Não mostrar... novamente neste aparelho`.

## Arquivo alterado

- `src/components/organizacao-em-harmonia/acervo-vivo-public-reader.tsx`

## Banco / Vercel

- Migration Supabase nova: **não**
- Variável de ambiente nova: **não**
- Cron novo: **não**
- Alteração em `vercel.json`: **não**

## Validação executada no pacote

O arquivo TSX alterado foi submetido ao `transpileModule` do TypeScript 5.8.3 e não apresentou erros de sintaxe.

O `npm run lint` e o `npm run build` completos devem ser executados no repositório local completo antes do commit, pois o ZIP de fontes enviado para análise é um recorte do repositório.
