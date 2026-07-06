Atualização: Funil / CRM unificado da Automação Extrema

Arquivos principais alterados/criados:
- src/app/admin/ae/funil/page.tsx
- src/app/api/admin/funil-crm/route.ts
- src/app/admin/ae/corrente-em-dia/funil/page.tsx
- src/components/admin-page-shell.tsx
- src/app/api/corrente-em-dia/leads/route.ts
- src/app/api/cron/corrente-em-dia-lead-alerts/route.ts
- src/app/api/organizacao-em-harmonia/leads/route.ts
- docs/PASSO_A_PASSO_AE_FUNIL_CRM_UNIFICADO.md

Objetivos:
1. Usar uma única tela Funil / CRM em /admin/ae/funil.
2. Exibir leads do Corrente em Dia, Organização em Harmonia, Agenda Viva, Atendimento em Harmonia e Diagnóstico AE.
3. Manter o menu lateral da gestão AE no desktop.
4. Remover a opção separada Funil Corrente em Dia do menu lateral.
5. Redirecionar /admin/ae/corrente-em-dia/funil para /admin/ae/funil?solution=corrente-em-dia.
6. Fazer leads de oh_leads, como o Tucxa, aparecerem no CRM unificado.
7. Padronizar etapas do funil.
