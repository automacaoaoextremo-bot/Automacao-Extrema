# AE Atendimento Inteligente — Solicitações para terceiros (2026-11-20)

## Objetivo
Uma pessoa autenticada na RMC pode registrar pedido para terceiro que não tem conta nem WhatsApp.
O `customer_id` e a `conversation_id` permanecem vinculados ao solicitante autenticado;
os campos `beneficiary_*` identificam exclusivamente a pessoa atendida. Seu telefone pode ser fixo
ou celular. O histórico multimídia permanece sob as permissões já existentes do pedido.

## Arquivos
- `src/components/atendimento-inteligente/request-form.tsx`: opção de terceiro, nome, telefone,
  relação, canal de contato, consentimento e endereço novo.
- `src/app/api/atendimento-inteligente/requests/route.ts`: validação servidor e chamada da RPC
  transacional, sem aceitar `customerId` ou `auth_user_id` do navegador para autorizar terceiro.
- `src/app/api/atendimento-inteligente/my/requests/route.ts`: acompanhamento pelo solicitante.
- `src/app/solucoes/atendimento-inteligente/rmc/meus-pedidos/page.tsx`: identificação da pessoa atendida.
- `src/components/atendimento-inteligente/request-queue.tsx`: dados para equipe N1/N2.
- `src/components/atendimento-inteligente/quote-editor.tsx`: canal telefônico sem presumir WhatsApp.
- `src/lib/atendimento-inteligente/timeline.ts`: cheque adicional do solicitante original.
- `src/app/api/atendimento-inteligente/requests/[id]/route.ts`: detalhes complementares.
- `supabase/migrations/20261120213000_ae_rmc_solicitacoes_para_terceiros.sql`: campos e RPC.

## Invariantes de segurança
- A conta do solicitante vem exclusivamente da sessão autenticada e do vínculo RMC.
- A pessoa atendida não obtém uma conta, senha, papel N1/N2 ou acesso ao histórico.
- Não se associa telefone de terceiro a `ae_ai_contacts` para reivindicar outra identidade.
- A nova RPC é executável apenas pela `service_role`; a API autentica antes da chamada.
- Endereço de terceiro é armazenado como local de atendimento no cadastro do solicitante,
  com rótulo identificador; não é possível escolher um endereço alheio por UUID.
- Os dados são privados: evitar exportar dados e nomes reais no GitHub, em ZIPs de fontes ou logs.

## Condições para produção
1. Verificar que migrations até `20261120160000_ae_rmc_timeline_multimidia.sql` existem.
2. Aplicar a nova migration em banco de homologação; não alterar status de pedidos existentes.
3. Rodar Node 24.x, `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
4. Homologar uso para terceiro com telefone fixo e celular, teste de autorização falsa,
   privacidade de outra conta, timeline, registro para si próprio, N1/N2.
5. Conferir que a solicitação permanece `pending` até Anderson alterar para `in_review`.
6. Enviar somente arquivos da evolução, homologar no Vercel Preview, revisar PR completo.
7. Backup do Supabase Production, migration Production, merge para main, deploy e teste de fumaça.

## Limites intencionais
- Não há envio automático de SMS/WhatsApp; `phone` é um canal de ligação manual.
- O beneficiário sem conta não acessa o portal e não recebe automaticamente notificações.
- Os áudios/fotos históricos devem ser importados posteriormente por N2 autorizado usando
  a ferramenta de importação multimídia já existente, preservando datas e hashes.
- O contato e consentimento são declarados pelo solicitante; verificação real pode exigir
  abordagem humana da equipe antes de iniciar obra ou compartilhar orçamento.
