# Automação Extrema · TUCXA · Agendamentos Ajustes 03 (V3)

**Branch:** `fix/tucxa-agendamentos-20261025-v1`  
**Base dos fontes:** ZIP enviado em 26/10/2026; commit indicado no `STATUS-GIT.txt`: `1ea05600fd13201abf2d7668ba868c7b537153bd`.

## Ajustes implementados

1. **Triagem ampliada (tablet/notebook):** filtros independentes de Consulentes e Entidades, com as respectivas letras disponíveis **imediatamente abaixo** de cada campo de busca. As letras de Consulentes refletem agendamentos não cancelados da data selecionada; a inicial é normalizada sem acento. As letras de Entidades mantêm o critério de atendimentos ativos.
2. **Tipografia da Triagem:** botões de letras e rótulos menores, nomes dos consulentes mais destacados nos cartões da visão ampliada.
3. **Encaminhamento em Caderno:** botão `Abrir Encaminhamento em Caderno — tablet/notebook`, visível a partir de `md`. Abre modal amplo com colunas por Entidade e botão **Encaminhar** por pessoa, usando a mesma API e permissões existentes. A aba Encaminhados permite desfazer o encaminhamento na visão ampla. O botão Fechar volta à versão compacta antes de encerrar o Encaminhamento.
4. **Ordem de atendimento:** segue a lógica previamente homologada: prioridades numéricas precedem a ordem de chegada registrada na Triagem; depois, a ordem `arrivalOrder` determina a sequência dentro de cada entidade. Assim, nenhuma prioridade é silenciosamente ignorada.
5. **Sem nova API, SQL ou dependência.** A interface compacta de celular permanece disponível.

## Arquivos alterados

- `src/app/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto/page.tsx` — atualizado integralmente.
- `docs/TUCXA_AGENDAMENTOS_AJUSTES_03_V3.md` — novo (este documento).

## Instalação e testes

1. Não altere `main`. Confirme que o worktree `C:\Users\lacos\Documents\GitHub\automacao-extrema-integracao-tucxa` está em `fix/tucxa-agendamentos-20261025-v1` e **limpo**.
2. Salve o ZIP na pasta `C:\Users\lacos\Documents\zips` e o instalador `.ps1` em `C:\Users\lacos\Documents\scripts`.
3. Rode o instalador; ele verifica **SHA-256 dos arquivos e da versão-base** e cria backup antes de escrever. Ele não faz commit, merge ou deploy.
4. Valide `npx eslint <arquivo>`, `npx tsc --noEmit`, `npm run build` com Node 24 e dependências locais instaladas.
5. Na Vercel Preview, confira Android (compacto), tablet e notebook (Caderno); teste ação Encaminhar somente com registros de homologação ou num Supabase separado. **Preview pode acessar o mesmo banco de produção.**
6. Publique por Pull Request para `main` somente após testes e homologação. Confirme Production/Ready e faça smoke tests de outras soluções.

## Checklist

- Busca e iniciais de Consulentes uma embaixo da outra.
- Busca e iniciais de Entidades uma embaixo da outra.
- Letras menores, nomes dos consulentes legíveis em tablet e notebook.
- Duas buscas funcionam de forma independente e em conjunto; normalização de acentos.
- Caderno de Encaminhamento agrupado por Entidade, sem paginação.
- Ordem segue prioridade e chegada; confira casos de prioridade e empates.
- Encaminhar e Desfazer usam as ações atuais, sem duplicações; persistência após atualizar.
- Fechar o Caderno amplo retorna ao Encaminhamento compacto; celular não apresenta regressão.
- Depois de homologar, fazer merge da atualização na `main` e conferir os principais fluxos TUCXA/Lu.

## Limitações de validação nesta entrega

A análise sintática do TSX foi executada com o compilador TypeScript disponível neste ambiente. A execução integral de `npx tsc`, ESLint e `npm run build` não foi concluída: as dependências npm não estavam em cache e o ambiente tem Node 22, enquanto o projeto pede Node 24. Portanto, **os testes locais no Windows são obrigatórios** antes de publicar.
