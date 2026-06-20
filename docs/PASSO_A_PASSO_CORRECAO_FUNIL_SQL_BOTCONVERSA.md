# Corrente em Dia — correção lint, SQL sem leads e BotConversa

## Arquivos atualizados
- `src/app/admin/ae/corrente-em-dia/funil/page.tsx`
- `supabase/sql/20260612_05_funil_whatsapp_corrente_em_dia.sql`

## Correção de lint
Removida a constante `stageOrder`, que estava declarada e não utilizada.

## SQL
Esta versão cria/ajusta a tabela `ced_leads`, índices, RLS, policy e trigger, mas não insere os três leads de simulação.

## BotConversa
Configurar um fluxo para capturar os dados do lead e usar Bloco de Integração/API para chamar o endpoint:
`POST https://www.automacaoextrema.com/api/corrente-em-dia/leads`
