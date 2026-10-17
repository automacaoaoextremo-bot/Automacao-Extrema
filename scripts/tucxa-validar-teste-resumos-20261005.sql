-- TUCXA - Agendamento 47
-- Validacao segura para o teste de 05/10/2026.
-- SOMENTE LEITURA: nao altera dados.
-- Pode ser executado antes ou depois da migration Ajustes 32.

-- 1. Organizacao TUCXA
select id as organization_id, name, slug
from public.oh_organizations
where lower(coalesce(slug,'')) = 'tucxa'
   or lower(coalesce(name,'')) like '%tucxa%';

-- 2. Configuracoes gerais do piloto.
-- Esperado para o teste:
-- pilotCavalinhoDailyWhatsappEnabled = true
-- pilotCavalinhoDailyWhatsappTime = "12:00"
-- pilotReceptionDailyWhatsappEnabled = true
-- pilotReceptionDailyWhatsappTime = "12:00"
-- pilotAutomaticDispatchWeekdays contendo 1 e 2 (segunda e terca).
select
  o.name,
  s.module_slug,
  s.settings -> 'pilotCavalinhoDailyWhatsappEnabled' as cavalinho_habilitado,
  s.settings ->> 'pilotCavalinhoDailyWhatsappTime' as horario_cavalinho,
  s.settings -> 'pilotReceptionDailyWhatsappEnabled' as recepcao_habilitada,
  s.settings ->> 'pilotReceptionDailyWhatsappTime' as horario_recepcao,
  s.settings -> 'pilotAutomaticDispatchWeekdays' as dias_automaticos,
  s.settings -> 'pilotConfirmationReminderOffsetsHours' as antecedencias_configuradas
from public.oh_module_settings s
join public.oh_organizations o on o.id = s.organization_id
where (lower(coalesce(o.slug,'')) = 'tucxa'
       or lower(coalesce(o.name,'')) like '%tucxa%')
  and s.module_slug = 'atendimento-em-harmonia';

-- 3. Agendamentos de 05/10/2026 + Entidade.
select
  a.id as appointment_id,
  a.appointment_date,
  a.appointment_time,
  a.status,
  a.confirmation_status,
  a.consulente_name,
  a.whatsapp,
  a.notification_contact_name,
  a.notification_contact_whatsapp,
  a.entity_id,
  e.name as entity_name,
  e.daily_capacity,
  e.pilot_cavalinho_whatsapp_enabled
from public.oh_consulente_appointments a
left join public.oh_spiritual_entities e on e.id = a.entity_id
join public.oh_organizations o on o.id = a.organization_id
where (lower(coalesce(o.slug,'')) = 'tucxa'
       or lower(coalesce(o.name,'')) like '%tucxa%')
  and a.appointment_date = date '2026-10-05'
order by e.name, a.appointment_time, a.created_at;

-- 4. Entidade TESTE.
-- Para restringir o teste ao Cavalinho da entidade TESTE,
-- pilot_cavalinho_whatsapp_enabled deve estar true somente nela.
select
  e.id as entity_id,
  e.name,
  e.active,
  e.daily_capacity,
  e.pilot_cavalinho_whatsapp_enabled
from public.oh_spiritual_entities e
join public.oh_organizations o on o.id = e.organization_id
where (lower(coalesce(o.slug,'')) = 'tucxa'
       or lower(coalesce(o.name,'')) like '%tucxa%')
order by e.name;

-- 5. Cavalinho vinculado a Entidade TESTE.
select
  e.name as entity_name,
  l.relationship_type,
  l.active as link_active,
  p.id as person_id,
  p.full_name,
  p.whatsapp,
  p.active as person_active
from public.oh_person_entity_links l
join public.oh_spiritual_entities e on e.id = l.entity_id
join public.oh_people p on p.id = l.person_id
join public.oh_organizations o on o.id = l.organization_id
where (lower(coalesce(o.slug,'')) = 'tucxa'
       or lower(coalesce(o.name,'')) like '%tucxa%')
  and lower(coalesce(e.name,'')) like '%teste%'
order by p.full_name;

-- 6. Pessoas ativas e preferencias individuais.
-- reception_summary_channels controla se cada pessoa recebe
-- o resumo por WhatsApp, e-mail, ambos ou nenhum.
select
  p.id as person_id,
  p.full_name,
  p.whatsapp,
  p.email,
  p.notification_email,
  p.active as person_active,
  m.active as membership_active,
  m.agenda_viva_profile,
  pref.reception_summary_channels,
  pref.reminder_whatsapp_enabled,
  pref.reminder_offsets_hours
from public.oh_memberships m
join public.oh_people p on p.id = m.person_id
join public.oh_organizations o on o.id = m.organization_id
left join public.oh_tucxa_pilot_person_preferences pref
  on pref.organization_id = m.organization_id
 and pref.person_id = m.person_id
where (lower(coalesce(o.slug,'')) = 'tucxa'
       or lower(coalesce(o.name,'')) like '%tucxa%')
  and m.active = true
  and p.active = true
order by p.full_name;

-- 7. Confirma se a tabela de controle idempotente ja existe.
select
  to_regclass('public.oh_tucxa_pilot_daily_dispatches') as tabela_daily_dispatches;

-- 8. Consulta o controle de disparos SOMENTE se a tabela existir.
-- O bloco abaixo nao falha caso a migration ainda nao tenha sido aplicada.
do $$
declare
  v_exists boolean;
  v_count integer;
begin
  v_exists := to_regclass('public.oh_tucxa_pilot_daily_dispatches') is not null;

  if not v_exists then
    raise notice 'ATENCAO: oh_tucxa_pilot_daily_dispatches NAO existe. Execute a migration 20261001190000_oh_tucxa_agendamento_piloto_ajustes_32.sql antes do teste.';
    return;
  end if;

  execute $q$
    select count(*)
    from public.oh_tucxa_pilot_daily_dispatches d
    join public.oh_organizations o on o.id = d.organization_id
    where (lower(coalesce(o.slug,'')) = 'tucxa'
           or lower(coalesce(o.name,'')) like '%tucxa%')
      and d.dispatch_date = date '2026-10-05'
  $q$ into v_count;

  raise notice 'Registros de controle de disparo em 05/10/2026: %', v_count;
end $$;

-- 9. Resumo dos agendamentos por Entidade.
select
  e.name as entity_name,
  e.pilot_cavalinho_whatsapp_enabled,
  count(*) as total_agendamentos
from public.oh_consulente_appointments a
join public.oh_spiritual_entities e on e.id = a.entity_id
join public.oh_organizations o on o.id = a.organization_id
where (lower(coalesce(o.slug,'')) = 'tucxa'
       or lower(coalesce(o.name,'')) like '%tucxa%')
  and a.appointment_date = date '2026-10-05'
group by e.id, e.name, e.pilot_cavalinho_whatsapp_enabled
order by e.name;

-- 10. Logs de lembretes do dia.
-- Antes do teste, nao deve existir "day_reminder" sent indevido para 05/10.
select
  l.appointment_id,
  l.notification_type,
  l.scheduled_offset_hours,
  l.status,
  l.sent_at,
  l.error
from public.oh_tucxa_pilot_notification_log l
join public.oh_consulente_appointments a on a.id = l.appointment_id
join public.oh_organizations o on o.id = l.organization_id
where (lower(coalesce(o.slug,'')) = 'tucxa'
       or lower(coalesce(o.name,'')) like '%tucxa%')
  and a.appointment_date = date '2026-10-05'
order by l.created_at;
