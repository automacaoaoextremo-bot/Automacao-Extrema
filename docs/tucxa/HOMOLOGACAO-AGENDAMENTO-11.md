# Homologação · TUCXA Agendamento 11

## Pré-requisitos

1. Branch `feature/tucxa-em-harmonia-agendamentos-piloto-v1`.
2. `npm run lint` sem erros/warnings.
3. `npm run build` concluído.
4. Migration `20260926224500_oh_tucxa_agendamento_piloto_ajustes_11.sql` aplicada.
5. `BOTCONVERSA_TUCXA_REMINDER_FLOW_ID` configurado no Preview.
6. `CRON_SECRET` configurado no Preview para teste manual.

## Cancelamento pela Recepção

1. Abrir `Acolhimento`.
2. Abrir `Ações` de um agendamento ativo.
3. Tocar `Cancelar`.
4. Confirmar que abre popup.
5. Tentar confirmar sem motivo: o sistema deve impedir.
6. Informar um motivo.
7. Confirmar.
8. Validar popup `Agendamento cancelado`.
9. Reabrir o item e confirmar status `Cancelado`.
10. Validar no banco `cancellation_reason` e `cancelled_at`.

## Acolhimento

1. Abrir o popup.
2. Confirmar que a visualização inicial é `Entidade / Dia`.
3. Confirmar o formato da data como `segunda-28/09/2026` (exemplo).
4. Confirmar que não existe opção `Todos` no filtro de status.
5. Marcar/desmarcar simultaneamente:
   - Confirmar
   - Chegou
   - Não Chegou
   - Cancelado
6. Confirmar que mais de uma opção pode permanecer ativa.
7. Confirmar que data/visualização/status ficam fixos no topo durante eventual rolagem.
8. Confirmar paginação compacta de 2 pessoas por página no celular.

## Exclusão na área logada

Abrir:

`/solucoes/organizacao-em-harmonia/cliente/atendimento-em-harmonia/agendamentos`

1. Escolher agendamento futuro/de teste sem chegada/ausência.
2. Tocar `Excluir`.
3. Confirmar no popup.
4. Validar remoção da lista.
5. Validar auditoria `delete_appointment_admin`.
6. Tentar excluir um agendamento com chegada ou ausência registrada.
7. Confirmar bloqueio para preservação do histórico.

## Confirmação pública

1. Abrir um link de confirmação válido.
2. Confirmar que NÃO aparece `Porta reabre`.
3. Confirmar presença.
4. Confirmar que o último quadro redundante de “Presença confirmada” não aparece.
5. A mensagem superior e os dados do atendimento devem permanecer suficientes para indicar a confirmação.

## BotConversa · fluxo de confirmação

1. Editar `TUCXA - Confirmar Agendamento`.
2. Adicionar `Contato` com:
   - TUCXA - Recepção
   - +55 19 98904-5150
3. Enviar uma confirmação de teste.
4. Confirmar que o contato aparece no WhatsApp e pode ser aberto.

## BotConversa · lembrete do dia

1. Criar `TUCXA - Lembrete Agendamento`.
2. Obter ID via `GET /flows/`.
3. Configurar `BOTCONVERSA_TUCXA_REMINDER_FLOW_ID`.
4. Fazer Redeploy do Preview.
5. Criar agendamento para hoje.
6. Chamar manualmente `/api/cron/tucxa-agendamento-reminders` com `CRON_SECRET`.
7. Confirmar mensagem recebida.
8. Confirmar a frase sobre confirmação até 16:00.
9. Confirmar que o link original continua disponível.
10. Rodar novamente e confirmar que não duplica um lembrete já enviado.

## Produção

O cron definido em `vercel.json` só fica ativo no deployment Production.
Não fazer merge para `main` antes de concluir a homologação do Preview.
