# Bingo no Controle — Correcao da V1 no Supabase de producao compartilhado

## Confirmacoes observadas em 01/11/2026
- 15 tabelas bnc_* e todas com RLS ATIVO.
- Politica bnc_members_own_read: PERMISSIVE, SELECT, roles {authenticated}, USING (user_id = auth.uid()), with_check nulo.
- Erro 42710 por tentativa de recriar politica existente.

## Qual arquivo executar AGORA?
1. Use `supabase/diagnostics/bingo-no-controle-producao-v1-reconciliar.sql` no SQL Editor do projeto de producao identificado visualmente. Este SQL somente valida objetos e cria os cinco indices IF NOT EXISTS, em transacao. Nao execute novamente a V1 inteira no banco ja parcialmente preparado.
2. Em seguida rode `supabase/diagnostics/bingo-no-controle-producao-v1-validar.sql` e confira resultados.
3. A `supabase/migrations/20261018220000_bingo_no_controle_v1.sql` e a versao COMPLETA corrigida da fonte original para manter no repositorio. Alterar uma migration ja aplicada pode causar divergencias de historico/hash; documente a excecao e prefira migrations adicionais em fluxo consolidado. Nao execute esta migration sobre producao sem revisar previamente o historico de migrations.

## Limites
- Nao ha copia das migrations V04/V05 nesta entrega; nao foi possivel auditar seu SQL completo.
- O fato de existirem 15 tabelas nao comprova que a V04/V05 foi integralmente aplicada.
- Nao execute importacao dos dados historicos, nem merge para main, nem alteracoes de chaves de autenticacao antes das proximas verificacoes.
- Nenhuma operacao foi executada em Supabase ou Vercel por este pacote.
