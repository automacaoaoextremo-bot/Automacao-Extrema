# Bingo no Controle — Etapa 1 (estrutura segura)

## Escopo entregue
- Schema `bnc_*` multi-organização isolado, sem alteração do schema legado.
- Página institucional `/solucoes/bingo-no-controle`.
- Página do cliente fundador `/solucoes/bingo-no-controle/cliente/tucxa`.
- Mapeamento de origem e plano de homologação.

## Limitações deliberadas
Não há checkout, integração Pix, importação automática, login de gestão, sorteio em tempo real ou emissão de cartelas nesta etapa. Tabelas RLS permanecem **fechadas** para acesso padrão, exceto leitura da própria associação em `bnc_members`. O advogado validou a proposta segundo relato do cliente; isso não substitui implementar controles técnicos, contrato com provedor e operação homologada.

## Mapeamento origem -> destino
app_mode_settings -> bnc_events/configuração futura; audit_logs -> auditoria futura;
draw_events -> bnc_draws; event_card_sales -> bnc_orders + bnc_payments + bnc_cards;
event_days -> bnc_events; prize_images -> bnc_prizes/imagens futuras;
prize_import_batches -> importações futuras; prizes -> bnc_prizes;
profiles -> bnc_members, sem replicar usuários auth automaticamente;
public_release_settings -> configuração de publicação futura;
round_awards -> bnc_awards; rounds -> bnc_rounds;
winner_claims -> bnc_winner_claims; winners -> registro de ganhadores futuro.

## Dados históricos da origem
app_mode_settings=3; audit_logs=15; draw_events=1076; event_card_sales=0; event_days=3; prize_images=0; prize_import_batches=0; prizes=1; profiles=1; public_release_settings=3; round_awards=55; rounds=27; winner_claims=64; winners=48. Dados **não são importados automaticamente**.

## Atenção especial para a migração histórica
A origem pode conter eventos Sementinha e TUCXA; não atribuir toda a base ao TUCXA sem conferência. Preservar IDs antigos na tabela bnc_legacy_map, e horários UTC, sequências e históricos de anulação. Antes de importar usuários, identificar referências auth.users existentes. Antes de migrar valores, conferir centavos e estornos. Importar apenas em homologação, validar contagens e relacionamentos e então planejar cutover.

## Implantação
1. Criar branch a partir de `main`, ou utilizar a branch existente de Bingo.
2. Copiar apenas os arquivos relativos ao repositório, mantendo paths.
3. Executar `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
4. Publicar preview na Vercel pela branch.
5. **Não aplicar migrations automaticamente em produção**: revisar a migration no projeto Supabase de homologação, verificar namespace `bnc_*` não existente, RLS e políticas. A migration cria tabelas, portanto executar apenas com aprovação.
6. Testar as duas novas rotas. Não prometer compra ativa.
