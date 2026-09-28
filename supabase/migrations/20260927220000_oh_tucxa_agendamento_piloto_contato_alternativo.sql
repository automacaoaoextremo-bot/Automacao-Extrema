-- Organização em Harmonia / TUCXA
-- Agendamento Piloto — contato alternativo para confirmação/lembretes
-- 27/09/2026
--
-- Mantém a identidade do Consulente separada do familiar/responsável que
-- recebe mensagens quando o Consulente não possui WhatsApp ou prefere outro contato.

alter table if exists public.oh_consulente_appointments
  add column if not exists notification_contact_type text not null default 'consulente',
  add column if not exists notification_contact_name text,
  add column if not exists notification_contact_relationship text,
  add column if not exists notification_contact_whatsapp text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'oh_consulente_appointments_notification_contact_type_check'
      and conrelid = 'public.oh_consulente_appointments'::regclass
  ) then
    alter table public.oh_consulente_appointments
      add constraint oh_consulente_appointments_notification_contact_type_check
      check (notification_contact_type in ('consulente','alternate'));
  end if;
end
$$;

update public.oh_consulente_appointments
set
  notification_contact_name = coalesce(notification_contact_name, consulente_name),
  notification_contact_whatsapp = coalesce(notification_contact_whatsapp, whatsapp)
where notification_contact_name is null
   or notification_contact_whatsapp is null;

comment on column public.oh_consulente_appointments.notification_contact_type is
  'Destino das mensagens do agendamento: consulente ou alternate (familiar/responsável).';
comment on column public.oh_consulente_appointments.notification_contact_name is
  'Nome de quem recebe confirmação e lembretes; não altera a identidade do Consulente.';
comment on column public.oh_consulente_appointments.notification_contact_relationship is
  'Vínculo opcional do contato alternativo com o Consulente (ex.: filha, filho, cuidador).';
comment on column public.oh_consulente_appointments.notification_contact_whatsapp is
  'WhatsApp de destino para confirmação e lembretes do agendamento.';
