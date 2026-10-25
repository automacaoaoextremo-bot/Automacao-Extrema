# Bingo no Controle — Ajustes 02: inventário e migração

## Escopo entregue
- Página pública no padrão do `TucxaPublicHeader`, com comunicação de benefícios inspirada no material Deep Dive, sem promessas de prêmios não confirmados.
- Rota administrativa bloqueada até integrar autenticação e políticas de acesso. **Não é o administrativo completo.**
- SQL de diagnóstico **somente leitura** para selecionar eventos históricos; nenhum dado é importado, alterado ou excluído.

## Mapa das 14 tabelas legadas
| Origem public | Destino lógico | Observação |
|---|---|---|
| event_days | bnc_events | Vincular à organização correta após validação; excluir teste pela identificação aprovada |
| rounds | bnc_rounds | Mapear event_day_id → event_id |
| draw_events | bnc_draws | Preservar source, is_voided, motivo e autor em campos extras/migration posterior |
| round_awards | bnc_awards | Mapear prêmio e modalidade |
| prizes | bnc_prizes | Histórico de catálogo; identificar organização e doador |
| prize_images | tabela dedicada futura | Não presumir arquivos físicos presentes |
| prize_import_batches | tabela dedicada futura | Preservar origem dos lotes |
| winner_claims | bnc_winner_claims | Ampliar colunas antes de importar para não perder histórico |
| winners | tabela dedicada futura | Preservar ganhadores confirmados |
| event_card_sales | bnc_orders + bnc_payments + bnc_cards | Mapeamento sujeito à conciliação; origem com 0 registros no dump |
| profiles | bnc_members + identidade | Não migrar senhas diretamente |
| audit_logs | tabela dedicada futura | Manter trilha histórica |
| app_mode_settings | configuração por evento | Regras e status precisam de mapeamento |
| public_release_settings | configuração de publicação | Abertura pública nunca presumida |

## Eventos e critérios de migração
Dump de 18/10/2026: 3 eventos, 27 rodadas, 1.076 registros de sorteio, 55 premiações, 64 solicitações de ganhador e 48 ganhadores. Números devem ser reconciliados por evento. O evento de teste deve ser identificado por ID usando consulta de prévia, não apagado na fonte. Não atribuir automaticamente ao TUCXA históricos pertencentes a outras entidades.

## Bloqueadores funcionais antes de publicar administração
1. Portar servidor de autenticação do legado e criar guardas de acesso por `bnc_members.organization_id`, inclusive em cada API.
2. Portar funcionalidades: eventos, configurações, rodadas, sorteios, prêmios, QR, financeiro, reivindicações, relatórios, preview público.
3. Criar tabelas de histórico ausentes na migration V1 e colunas de auditoria antes de importar.
4. Implementar importação com `bnc_legacy_map`, idempotência, transações e relatórios comparativos, usando ambiente de homologação.
5. Configurar pagamentos com webhook assinado e entrega atômica de cartelas; não ativar `sales_enabled` antes de testes.

## Implantação
A rota `/solucoes/bingo-no-controle/cliente/tucxa/admin` é intencionalmente inacessível enquanto não houver acesso seguro. Nunca ative `BNC_ADMIN_INTEGRATED=true` como substituto de autenticação.
