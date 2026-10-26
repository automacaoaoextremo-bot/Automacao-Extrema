# Automação Extrema — TUCXA / Ajustes 01 (Triagem e Caderno)

## Branch e arquivo-base

- Branch esperada: `fix/tucxa-agendamentos-20261025-v1`
- Worktree local: `C:\Users\lacos\Documents\GitHub\automacao-extrema-integracao-tucxa`
- Arquivo de origem: ZIP `tucxa-agendamentos-ajustes-01-fontes-20261025-212357.zip`, branch `fix/tucxa-agendamentos-20261025-v1`, commit `7ca9f5378a276902d8bed08bda1e3ca878ec4670`.
- Não traz migração SQL, nova API nem nova dependência npm.

## Ajustes implementados

1. Triagem nas visões Entidade e Consulente: `Trocar Entidade` passa a ficar na grade de botões junto com `Reagendar`, sem uma linha exclusiva.
2. Triagem ampla para tablet/notebook: opção **Abrir Triagem em Caderno — tablet/notebook**, disponível a partir de `md`; abre o modal em largura ampliada, agrupando as Entidades em colunas, com ações `Chegou`, `Reagendar`, `Trocar Entidade`, `Cancelar`, `Definir Prioridade`, `Não Chegou` em cada linha de consulente. Apresenta resumo do dia e buscas independentes por nome/WhatsApp e Entidade. Reutiliza as funções e validações existentes.
3. Caderno compacto: no espaço antes usado por `Agendamento N` e status `Solicitado`/`Confirmado`, apresenta atalhos `Trocar Entidade` e `Reagendar` para agendamentos ativos. Preserva informação de cancelamento, chegada, ausência, primeiro atendimento e prioridade, além dos campos de ordem de chegada e Salvar.

## Como instalar

1. Salvar `ae-tucxa-triagem-ajustes-01-v1-arquivos-completos.zip` na pasta `C:\Users\lacos\Documents\zips`.
2. Salvar `instalar_tucxa_triagem_ajustes_01_v1.ps1` em `C:\Users\lacos\Documents\scripts`.
3. Verificar branch e `git status` limpo, antes de executar o instalador. O instalador confere hash do arquivo anterior, pacote e caminhos; faz backup e não executa commit/push.
4. Rodar `npm ci` se as dependências não estiverem instaladas.
5. Rodar `npx eslint src/app/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto/page.tsx`, `npx tsc --noEmit` e `npm run build` em Node 24.
6. Conferir `git diff --check`, revisar apenas os dois arquivos e fazer commit/push na branch.
7. Homologar no Vercel Preview em celular e tablet/notebook, preferencialmente com dados de teste separados. **Preview pode usar o Supabase de produção; não executar ações destrutivas em agendamentos reais.**
8. Após homologação, comparar com `origin/main`, abrir PR `fix/tucxa-agendamentos-20261025-v1` → `main`, conferir diff e executar merge. Verificar deployment Production/Ready e fluxos essenciais em produção.

## Casos de teste recomendados

- Mobile: Triagem → Entidade ou Consulente → Ações → botões `Reagendar` e `Trocar Entidade` lado a lado.
- Mobile: Triagem → Caderno → registros ativos mostram ambos os atalhos, preservam Ordem/Salvar; cancelados e ausentes permanecem reconhecíveis.
- Tablet/notebook: abrir Triagem ampliada, conferir data, contadores, busca de Consulente e Entidade separadas, grupos e seis ações em cada linha.
- Testar permissões e estados bloqueados: triagem finalizada, agendamento cancelado, consulente que já chegou, prioridade registrada.
- Verificar que os botões abrem os fluxos originais e que a troca de visão não modifica dados.
- Fazer teste de fumaça do Livro Musical da Lu, Presença Querida, Impacto no Controle e Bazar após deploy de produção.

## Limites da validação nesta entrega

Foi validada a sintaxe TSX com TypeScript 5.8.3, a consistência estrutural do ZIP e seus SHA-256. Como o ZIP de fontes não inclui `node_modules` nem a aplicação inteira, não foi possível executar o ESLint, a checagem integral de tipos ou o build Next.js aqui. Esses testes são obrigatórios no worktree Windows antes do push.
