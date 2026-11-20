# BNC V07E — Correção de migração / reconciliação

## Diagnóstico
O SQL original abortava se encontrasse *qualquer* objeto V07E (`bnc_prizes.archived_at` **ou** `bnc_v07e_prize_update`). Isso pode indicar instalação parcial ou anterior, não necessariamente V07E completa. O `RAISE EXCEPTION P0001` é intencional.

## Como usar
1. Confirme **homologação** `zbqcngvohidmwqkfwwvf`, não o projeto de produção compartilhado.
2. Garanta backup recuperável. Execute `supabase/diagnostics/bnc_v07e_diagnostico_reconciliacao.sql` e salve o resultado.
3. Se houver 2 colunas corretas, 2 índices e 5 funções **já existentes**, **não rode nenhuma migração**: examine as propriedades e permissões e teste o sistema.
4. Se faltar algum objeto e os tipos estiverem corretos, revise o SQL completo corrigido com responsável pelo banco e execute **uma vez em homologação** `supabase/migrations/20261102234500_bnc_admin_07e_eventos_catalogos.sql`.
5. O script cria apenas colunas, índices e funções faltantes. Preserva código de funções existentes e revoga permissões públicas, concedendo `EXECUTE` a `authenticated`. Não altera linhas.
6. Verifique os dois diagnósticos (pre/post) e as operações com usuário manager e conta sem vínculo. Não faça deploy ou execução em produção antes de passar todos os testes.
7. Se uma função V07E já existir com corpo diferente do esperado, a rotina **não a substitui**; é necessário auditar `pg_get_functiondef` antes de publicar.

## Git
Branch `feature/bingo-no-controle-cliente-fundador-tucxa-v1`. `git add` apenas a migration corrigida e os diagnósticos; revise `git diff --cached` antes do commit.

## Observações de segurança
- `SECURITY DEFINER` executa com os privilégios do proprietário. Testar RLS e papéis da aplicação com sessão real.
- Nunca use `DROP FUNCTION`, `DROP COLUMN`, `TRUNCATE`, ou `supabase db push` indiscriminado para superar esse erro.
- Alterar uma migration já registrada no histórico pode gerar discrepância de checksums. Para ambientes que já a registraram, usar uma migration corretiva com timestamp posterior, após auditoria.
