-- Organização em Harmonia / TUCXA
-- Agendamento 11 — WhatsApp/BotConversa e lembretes no dia do atendimento.
--
-- Ajuste aditivo/idempotente:
-- 1. permite registrar "whatsapp" no log de notificações do piloto;
-- 2. preserva compatibilidade com os canais antigos sms/e-mail.

do $$
begin
  if to_regclass('public.oh_tucxa_pilot_notification_log') is not null then
    alter table public.oh_tucxa_pilot_notification_log
      drop constraint if exists oh_tucxa_pilot_notification_log_channel_check;

    alter table public.oh_tucxa_pilot_notification_log
      add constraint oh_tucxa_pilot_notification_log_channel_check
      check (channel in ('sms', 'email', 'whatsapp'));
  end if;
end
$$;

comment on table public.oh_tucxa_pilot_notification_log is
  'Log de notificações do piloto de agendamentos, incluindo confirmações e lembretes via WhatsApp/BotConversa.';
