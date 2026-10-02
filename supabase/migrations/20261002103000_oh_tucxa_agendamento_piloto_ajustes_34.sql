-- Organização em Harmonia / TUCXA
-- Agendamento Piloto — Ajustes 34
-- 02/10/2026
-- Atualização atômica do WhatsApp próprio de Consulente que antes usava contato responsável.
-- O vínculo operacional passa a ser o próprio Consulente, preservando o contato anterior
-- no histórico JSONB do agendamento.

create or replace function public.oh_tucxa_pilot_adopt_own_whatsapp(
  p_organization_id uuid,
  p_person_id uuid,
  p_whatsapp text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_count integer := 0;
begin
  if nullif(btrim(coalesce(p_whatsapp, '')), '') is null then
    raise exception 'WHATSAPP_REQUIRED';
  end if;

  select full_name
    into v_name
    from public.oh_people
   where organization_id = p_organization_id
     and id = p_person_id
     and active = true
   for update;

  if v_name is null then
    raise exception 'PERSON_NOT_FOUND';
  end if;

  if exists (
    select 1
      from public.oh_people
     where organization_id = p_organization_id
       and id <> p_person_id
       and whatsapp = p_whatsapp
       and active = true
  ) then
    raise exception 'WHATSAPP_IN_USE';
  end if;

  update public.oh_consulente_appointments
     set metadata = coalesce(metadata, '{}'::jsonb)
       || jsonb_build_object(
            'contact_history',
            case when jsonb_typeof(metadata -> 'contact_history') = 'array' then metadata -> 'contact_history' else '[]'::jsonb end
            || jsonb_build_array(
                 jsonb_build_object(
                   'type', coalesce(notification_contact_type, ''),
                   'name', coalesce(notification_contact_name, ''),
                   'relationship', coalesce(notification_contact_relationship, ''),
                   'whatsapp', coalesce(notification_contact_whatsapp, ''),
                   'sourceContactPersonId', coalesce(source_contact_person_id::text, ''),
                   'changedAt', now(),
                   'reason', 'Consulente passou a utilizar WhatsApp próprio.'
                 )
               )
          ),
         whatsapp = p_whatsapp,
         notification_contact_type = 'consulente',
         notification_contact_name = v_name,
         notification_contact_relationship = null,
         notification_contact_whatsapp = p_whatsapp,
         source_contact_person_id = null
   where organization_id = p_organization_id
     and person_id = p_person_id;

  get diagnostics v_count = row_count;

  update public.oh_people
     set whatsapp = p_whatsapp
   where organization_id = p_organization_id
     and id = p_person_id;

  return v_count;
end;
$$;

comment on function public.oh_tucxa_pilot_adopt_own_whatsapp(uuid, uuid, text) is
  'Adota o WhatsApp próprio do Consulente e desvincula atomicamente todos os seus agendamentos do contato responsável, preservando o histórico anterior no metadata.';

revoke all on function public.oh_tucxa_pilot_adopt_own_whatsapp(uuid, uuid, text) from public;
revoke all on function public.oh_tucxa_pilot_adopt_own_whatsapp(uuid, uuid, text) from anon;
revoke all on function public.oh_tucxa_pilot_adopt_own_whatsapp(uuid, uuid, text) from authenticated;
grant execute on function public.oh_tucxa_pilot_adopt_own_whatsapp(uuid, uuid, text) to service_role;
