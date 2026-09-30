# TUCXA — Agendamento Piloto — Homologação 16

## Objetivo
Validar a correção do preenchimento do campo de data do BotConversa antes do disparo do fluxo de confirmação.

## Cenário principal
1. Criar um novo agendamento para um consulente com WhatsApp válido.
2. Confirmar que o agendamento aparece na Fila de atendimento.
3. No popup "Agendamento criado", confirmar que não aparece erro de `set_field_tucxa_data_*`.
4. Confirmar o recebimento automático da mensagem pelo WhatsApp do consulente.
5. Abrir o contato no BotConversa e conferir os campos personalizados de nome, data, entidade e link de confirmação.
6. Abrir o link de confirmação e confirmar presença.
7. Validar o aviso destinado à Recepção do TUCXA.

## Diagnóstico em caso de falha
Nos logs da Vercel, procurar por `[TUCXA piloto BotConversa envio]` e observar `steps`.
Para o campo de data, a ordem esperada é:
- `set_field_tucxa_data`: DD/MM/AAAA;
- `set_field_tucxa_data_iso_fallback`: AAAA-MM-DD, somente se a primeira forma falhar;
- `set_field_tucxa_data_unix_fallback`: timestamp Unix, somente se as duas anteriores falharem.

Se uma etapa de data tiver `ok: true`, o envio pode prosseguir. Se todas falharem, registrar `status` e `responseText` antes de qualquer novo ajuste.

## Vercel
Para homologar pela URL Preview da branch, as variáveis `BOTCONVERSA_TUCXA_*` necessárias também precisam estar habilitadas para Preview. Para produção, manter Production.
