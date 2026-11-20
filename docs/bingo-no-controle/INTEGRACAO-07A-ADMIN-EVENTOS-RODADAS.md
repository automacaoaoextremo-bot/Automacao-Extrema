# Bingo no Controle — Integração 07A (administrativo TUCXA)

## Base

Fontes extraídos do ZIP `bingo-tucxa-admin-03-fontes-20261102-085009.zip`, com referências ao administrativo de `bingo-legado/web_bingo`. Branch esperada: `feature/bingo-no-controle-cliente-fundador-tucxa-v1`.

Esta entrega é a primeira etapa operacional do requisito Bingo-03. **NÃO** afirma paridade completa com o sistema antigo.

## Entregue

- Menu lateral com eventos, resumo, configurações, rodadas, prêmios, bingos chamados, QR codes, financeiro, relatórios, prévia pública e operação.
- Login e controle por `bnc_members` preservados; visualização sempre filtrada por organização `tucxa` e políticas RLS.
- Listagem de eventos, leitura de rodadas, sorteios válidos, premiações e catálogo de prêmios da organização.
- Cadastro de evento em **rascunho e privado**, sem habilitar venda ou publicação.
- Edição de metadados de evento **somente em rascunho/preparado** por `owner` ou `manager`.
- Cadastro de rodadas **planejadas** nesses eventos e edição de título/valor de referência da rodada planejada.
- Relatório CSV com resumo por rodada (somente números, sem dados pessoais).
- Eventos concluídos e seus sorteios históricos continuam somente leitura.

## NÃO entregue nesta etapa

- Operação de sorteios, undo/cancelamento, criação e publicação de prêmio, atualização de chamados/ganhadores, QR codes específicos por evento, financeiro, cartelas, cobrança, pagamentos e prestação de contas completa.
- Migração dos códigos legado `web_bingo` ou das tabelas antigas para o banco compartilhado. Esses recursos precisam de endpoints/rotinas transacionais próprios, com autorização e auditoria.

A navegação exibe avisos explícitos nos módulos ainda não disponíveis. Não ligar à operação pública como se fossem funcionais.

## Arquivos completos

- `src/app/solucoes/bingo-no-controle/cliente/tucxa/admin/page.tsx` (substituir)
- `supabase/migrations/20261102120000_bnc_admin_eventos_rodadas_v07a.sql` (novo)
- `supabase/diagnostics/bnc_v07a_verificar.sql` (novo)
- `docs/bingo-no-controle/INTEGRACAO-07A-ADMIN-EVENTOS-RODADAS.md` (novo)

## Antes de aplicar SQL

1. Confirmar na interface do Supabase que o Project Ref é o de **HOMOLOGAÇÃO**: `zbqcngvohidmwqkfwwvf`.
2. Fazer backup/snapshot recuperável do ambiente e guardar a referência. Verificar políticas existentes em `bnc_events` e `bnc_rounds`.
3. Executar **somente** a migration V07A no SQL Editor. Não usar `supabase db push` no projeto compartilhado. A migração inclui `BEGIN/COMMIT`, não apaga histórico e aborta em caso de outra política de escrita preexistente.
4. Executar `supabase/diagnostics/bnc_v07a_verificar.sql` para auditar as políticas e concessões de coluna.

**Atenção:** A V07A não altera V1, V04 ou V05. Se já houver uma política V07A no destino, o script abortará em vez de substituí-la silenciosamente.

## Teste funcional em Preview

- Entrar como `owner/manager` do TUCXA.
- Ver apenas eventos do TUCXA (histórico esperado: 1 evento, 11 rodadas, 358 sorteios, 23 premiações).
- Ver o evento de 14/06/2026, que deve permanecer **sem possibilidade de edição**.
- Criar evento de teste claramente nomeado `homolog-bingo-tucxa-v07a` (rascunho, não público, vendas desativadas).
- Editar título/descrição do evento criado, alterar status `draft` → `ready`.
- Criar e editar uma rodada planejada para o evento de teste; confirmar que nenhum sorteio/pagamento foi emitido.
- Abrir relatórios e baixar CSV de estatísticas. Verificar no CSV os números históricos, sem nomes ou telefones.
- Testar com conta `viewer` do TUCXA: leitura permitida e criação/edição bloqueada.
- Testar com conta exclusiva do Sementinha e conta sem vínculo: acesso ao painel TUCXA negado; tentativas REST diretas de escrita em TUCXA devem falhar por RLS.
- Checar que as tabelas de pagamentos, cartelas e histórico bruto não são legíveis via cliente público.
- Não apagar nem criar registros de teste no Supabase de produção. Não publicar o evento de teste.

## Preparar aplicação em produção

1. Executar lint, TypeScript, build e `git diff --check` na branch.
2. Commit seletivo dos 4 arquivos, push e validar o deployment Preview da Vercel.
3. Revisar no GitHub todas as diferenças da branch em relação a `main` — ela já traz outras entregas.
4. Conferir credenciais: `NEXT_PUBLIC_BNC_ENV=homolog` no Preview e `production` em Production; a URL pública deve apontar aos refs corretos.
5. Verificar backup do Supabase compartilhado e aplicar V07A **no projeto de produção `ooegejytfldzkjeexggo`** apenas após todos os testes RLS.
6. Executar a consulta diagnóstica nesse projeto e validar contagens de histórico inalteradas.
7. Merge para `main` via PR somente após testes e migration de produção. A Vercel gerará produção automaticamente quando `main` é a production branch.
8. Testar a página `/solucoes/bingo-no-controle/cliente/tucxa/admin` e principais soluções já existentes após o deployment.

## Segurança e limitações

- Autenticação por cliente Supabase no navegador; autorização real depende da política RLS no banco. Nunca usar `service_role` no navegador.
- Campos de publicação, venda, IDs de organização e status operacional não possuem UPDATE público na V07A.
- Não criar triggers nem permissões globais em `auth.users` ou outras soluções.
- A data/horário do formulário é interpretada como hora de Campinas (`-03:00`), adequada ao contexto atual, mas precisa ser revista antes de permitir eventos fora desse fuso ou diante de mudança legal de horário.
- A V07A é nova migration e NÃO deve ser substituída por edição de V1/V04/V05 já aplicadas.
- O histórico do Sementinha continua separado do TUCXA por organização.
