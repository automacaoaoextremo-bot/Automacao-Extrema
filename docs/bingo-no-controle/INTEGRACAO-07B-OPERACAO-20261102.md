# Bingo no Controle — Integração 07B (TUCXA + grupo Sementinha)

## Escopo implementado

- Visão conjunta de eventos TUCXA e **Sementinha** para `owner`, `manager` ou `operator` vinculados ao TUCXA. A organização de origem permanece registrada em `organization_id`.
- Evento histórico **09/05/2026** continua `completed` e não pode ser editado. Administradores podem usá-lo como modelo para um **novo evento TUCXA** com rodadas `planned` e premiações-modelo, sem copiar sorteios ou dados de ganhadores.
- Nova seção **Rodada selecionada**, topo institucional com botão Sair, e navegação para operação e prêmios.
- Publicação explícita de evento (`is_public`), programação pública e cardápio por evento. Publicação não habilita vendas. Para editar os campos gerais no formulário V07A, retire previamente a publicação; o cadastro de prendas e cardápio pode continuar pelo RPC autorizado.
- Prendas cadastradas por gestores, vinculadas a uma rodada planejada; **somente prêmios confirmados com registro no catálogo** aparecem na área pública quando o evento estiver publicado. As premiações-modelo copiadas de 09/05 não são anunciadas como confirmadas.
- Cardápio informativo de evento (itens/categorias/preços); não possui pedidos, caixa ou pagamento.
- Operação manual de bingo 1–75 para uma rodada aberta: registrar pedra, desfazer última com motivo, encerrar rodada. Operações via RPC PostgreSQL com verificações de papel, locks e auditoria.
- Reivindicações de ganhadores: inclusão manual pendente e aceitação/rejeição com justificativa e confirmação da conferência física da cartela. **Não é uma validação algorítmica da combinação, nem emite prêmio ou cartela automaticamente.**
- QR Code PNG contendo somente a URL pública do evento; não representa cartela ou comprovante.
- SQL de diagnóstico antes/depois da migration.

## Limites importantes

1. **Não** implementa vendas ou emissão de cartelas, pagamentos, conciliação, prestação de contas financeira ou lógica automática de bingo (quina/cartela cheia). Módulo Financeiro permanece informativo.
2. A área privada antiga de ganhadores (`bnc_legacy_raw`) não é exposta no novo admin. O CSV histórico original permanece intacto.
3. Migração aplica a nova migration **exatamente uma vez**; não reaplicar V1/V04/V05 nem restaurar novamente o histórico.
4. A migration requer V07A já aplicada. Ela cria tabelas `bnc_menu_items` e `bnc_operator_audit`, altera apenas `bnc_draws` e `bnc_winner_claims`, cria políticas RLS e RPCs específicas. Não altera tabelas não-BNC.
5. Os RPCs utilizam `SECURITY DEFINER` com validação explícita do usuário e organização. Devem ser auditados e testados com usuários autenticados de cada perfil antes de produção. NUNCA usar `service_role` no navegador.
6. Prêmio não exige `donor_name` (mantido interno). A API pública só mostra os campos selecionados; não retorna telefone, nome de ganhador ou usuários.
7. A clonagem copia títulos das premiações históricas, não objetos físicos ou disponibilidade efetiva; confirme cada prenda antes de publicar.

## Banco — roteiro de homologação

**Somente projeto** `zbqcngvohidmwqkfwwvf` inicialmente.

1. Backup recuperável e SQL de diagnóstico prévio: `supabase/diagnostics/bnc_v07b_preflight_e_validacao.sql`.
2. Confira que `bnc_v07a_event_insert`/`bnc_v07a_round_update` existem. Confira duplicados em `bnc_draws` pelo par `round_id,number` com `is_voided=false`.
3. Execute **somente** `supabase/migrations/20261102183000_bnc_admin_operacional_v07b.sql` pelo SQL Editor, em uma única transação (ela já contém `BEGIN/COMMIT`).
4. Rode o diagnóstico novamente. Devem aparecer duas novas tabelas e RPCs `bnc_v07b_*`. Somente `bnc_v07b_public_events()` pode ser executada por `anon`; funções de mutação exigem `authenticated` e autorização interna.
5. Teste com `owner/manager` do TUCXA, `operator`, `viewer`, usuário vinculado somente ao Sementinha e usuário anônimo. Não use o SQL Editor como único teste de RLS; use sessões reais do navegador.

### Testes operacionais obrigatórios

- Usuário TUCXA manager vê os históricos de 09/05 (Sementinha) e 14/06 (TUCXA), sem misturar organização no banco. `viewer` não recebe histórico do Sementinha por extensão V07B.
- Os dois eventos antigos permanecem encerrados e não aceitam sorteios, edições ou novas reivindicações.
- Crie um evento **de teste novo, com slug inequívoco**, copiando o de 09/05; confirme `draft`, rodadas `planned`, premiações-modelo, **zero `bnc_draws` e zero `bnc_winner_claims`** no novo evento.
- Edite a rodada copiada e confira premiação; confirme que nem source nem outros eventos mudaram.
- Cadastre uma prenda, associe-a a uma rodada; cadastre dois itens de cardápio.
- Publique e confirme o aparecimento na página pública. Os dados pessoais jamais devem aparecer publicamente.
- Abra UMA rodada do **evento de teste publicado**. Sorteie números 1, 15, 75. Tente repetir 15: deve recusar. Desfaça a última pedra com motivo; registre 75 novamente; a pedra anterior deve permanecer anulada no banco.
- Crie reivindicação pendente, tente aceitar sem marcar cartela verificada (deve recusar). Aceite após conferência manual e justificativa; segunda aceitação para a mesma premiação deve falhar. Confira auditoria interna.
- Gere QR Code e abra URL pública. Teste com visitante anônimo e no celular.
- Confirme que `owner/manager/operator` de TUCXA não alteram evento encerrado do Sementinha, e que um viewer não executa RPC de escrita.
- Verifique novamente as contagens dos eventos históricos e que as outras soluções da Automação Extrema continuam funcionando.

**Não há um script de limpeza automática de testes**. Como o ambiente homologação pode manter histórico de QA, documente os IDs de teste e faça exclusões somente com plano auditado.

## GitHub/Vercel

Branch `feature/bingo-no-controle-cliente-fundador-tucxa-v1`. Faça backup local, extraia o ZIP, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check` e teste em Preview. Utilize `git add` somente dos arquivos desta entrega.

Na Vercel Preview: `NEXT_PUBLIC_BNC_ENV=homolog` e `NEXT_PUBLIC_BNC_SUPABASE_URL=https://zbqcngvohidmwqkfwwvf.supabase.co`. Na Production: `NEXT_PUBLIC_BNC_ENV=production`, URL `https://ooegejytfldzkjeexggo.supabase.co`, sempre com **chave pública adequada ao respectivo projeto**, nunca senha ou `service_role`.

## Produção

Não publicar enquanto teste de papéis, RLS, concorrência, dados públicos e reversão não for aprovado.

Após backup recuperável do banco compartilhado da Automação Extrema e revisão do SQL:

1. Aplique somente a migration V07B no projeto `ooegejytfldzkjeexggo` (V07A deve estar instalada nele). Se não estiver, primeiro homologue e aplique V07A controladamente, sem usar `supabase db push` sobre todas as soluções.
2. Diagnóstico SQL; confirme integridade e contagens antigas.
3. Confirme Vercel Production com variáveis de produção e Preview com homologação.
4. Faça PR da branch do Bingo para `main`, revise TODAS as mudanças acumuladas e faça merge após aprovação.
5. Confira deployment Vercel `Ready`, login, página pública, QR Codes, permissões e aplicações vizinhas. Sem executar importador histórico novamente.

Em caso de erro SQL, **não reaplique a migration nem elimine políticas/dados**. Registre mensagem e revise antes de nova tentativa.
