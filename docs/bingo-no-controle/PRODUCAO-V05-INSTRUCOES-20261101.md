# Bingo no Controle — produção compartilhada — V05

**Projeto de produção esperado (conferir visualmente no Dashboard):** `ooegejytfldzkjeexggo`.
**Projeto de homologação (não aplicar estes arquivos nele):** `zbqcngvohidmwqkfwwvf`.

## Origem e escopo

O arquivo de aplicação reaproveita a lógica da migration V05 homologada, mas foi preparado para uma **primeira aplicação no banco compartilhado de produção**.

- Confere a política `bnc_members_own_read` e a existência de seis tabelas.
- Aborta se já houver políticas de leitura de eventos, organizações, rodadas, sorteios ou premiações. Não usa `DROP POLICY`.
- Em uma transação, ativa RLS, restringe privilégios das seis tabelas BNC aos usos de leitura autorizada e cria as cinco políticas V05.
- Não cria usuários, não toca `auth.users` e não modifica dados históricos ou tabelas de outras soluções.
- Pode gerar erros de permissão se outra política ou aplicação BNC já existir; **não reexecutar sem análise**.

## Aplicação

1. Confirme o Project Ref no Supabase Dashboard.
2. Verifique que o diagnóstico anterior trouxe `politicas_v05_de_5 = 0` e todas as tabelas BNC com RLS. Uma alteração posterior exige reavaliar o procedimento.
3. Faça snapshot ou tenha um ponto de recuperação do projeto de produção.
4. No SQL Editor, execute **o conteúdo inteiro** de `supabase/diagnostics/bnc-producao-v05-aplicar-seguro-20261101.sql`.
5. Se houver erro, pare. A transação completa deve ser revertida, mas confirme o estado com a auditoria.
6. Depois, execute `supabase/diagnostics/bnc-producao-v05-verificar-20261101.sql`, exporte somente os resultados sem informação pessoal.

## Resultado esperado

- `tabelas_bnc=15`, `com_rls=15`, `politicas_v05=5`, `politicas_com_filtro_usuario=5`.
- `anon_pode_selecionar_eventos=false`;
  `authenticated_pode_selecionar_eventos=true`;
  `authenticated_pode_inserir_eventos=false`.
- `organizacoes=0`, `eventos=0`, `historico_bruto=0`, se nenhuma importação ocorreu depois do diagnóstico inicial.

## Próxima etapa

Após confirmar o resultado, verificar o backup privado local, o controle de acesso de produção, a integridade da importação e a separação entre TUCXA e Sementinha antes de liberar o painel. Não copiar senhas ou SQL com dados pessoais para GitHub/Vercel.

**Git:** manter estes arquivos de diagnóstico versionados na branch `feature/bingo-no-controle-cliente-fundador-tucxa-v1`; não alterar novamente a migration V05 que já foi aplicada em homologação.
