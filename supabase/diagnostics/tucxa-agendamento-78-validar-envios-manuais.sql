-- TUCXA / Ajuste 78
-- Diagnóstico somente leitura dos envios manuais da Gestão.

select
  a.appointment_date,
  a.id as appointment_id,
  a.consulente_name,
  a.status,
  a.confirmation_status,
  e.name as entidade,
  l.notification_type,
  l.status as envio_status,
  l.provider,
  l.sent_at,
  l.error,
  l.updated_at
from public.oh_consulente_appointments a
left join public.oh_spiritual_entities e
  on e.id = a.entity_id
 and e.organization_id = a.organization_id
left join public.oh_tucxa_pilot_notification_log l
  on l.organization_id = a.organization_id
 and l.appointment_id = a.id
 and l.channel = 'whatsapp'
 and l.scheduled_offset_hours = -1
 and l.notification_type in (
   'manual_reminder',
   'manual_confirmation_link',
   'manual_pizza',
   'day_reminder'
 )
where a.organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and a.appointment_date >= current_date
order by a.appointment_date, a.consulente_name, l.notification_type;

-- Resumo por data/tipo.
select
  a.appointment_date,
  l.notification_type,
  count(*) filter (where l.status = 'sent') as enviados,
  count(*) filter (where l.status = 'failed') as falhas
from public.oh_tucxa_pilot_notification_log l
join public.oh_consulente_appointments a
  on a.id = l.appointment_id
 and a.organization_id = l.organization_id
where l.organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and l.channel = 'whatsapp'
  and l.scheduled_offset_hours = -1
  and l.notification_type in (
    'manual_reminder',
    'manual_confirmation_link',
    'manual_pizza',
    'day_reminder'
  )
group by a.appointment_date, l.notification_type
order by a.appointment_date, l.notification_type;
