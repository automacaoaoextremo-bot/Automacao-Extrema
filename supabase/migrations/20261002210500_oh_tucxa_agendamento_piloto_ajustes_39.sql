-- Organização em Harmonia / TUCXA
-- Agendamento Piloto — Ajustes 39
-- 02/10/2026
-- Permite que um Consulente agendado por terceiro, ainda sem cadastro próprio em
-- oh_people, passe a usar seu próprio WhatsApp a partir do próprio agendamento.

create or replace function public.oh_tucxa_pilot_adopt_own_whatsapp_by_appointment(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_whatsapp text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.oh_consulente_appointments%rowtype;
  v_person_id uuid;
  v_person_name text;
  v_source_contact_person_id uuid;
  v_count integer := 0;
begin
  if nullif(btrim(coalesce(p_whatsapp, '')), '') is null then
    raise exception 'WHATSAPP_REQUIRED';
  end if;

  select *
    into v_appointment
    from public.oh_consulente_appointments
   where organization_id = p_organization_id
     and id = p_appointment_id
   for update;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  v_person_name := nullif(btrim(coalesce(v_appointment.consulente_name, '')), '');
  if v_person_name is null then
    raise exception 'PERSON_NAME_REQUIRED';
  end if;

  -- Se o agendamento já aponta para uma pessoa cadastrada, reaproveita a regra
  -- atômica criada no Ajuste 34.
  if v_appointment.person_id is not null then
    return public.oh_tucxa_pilot_adopt_own_whatsapp(
      p_organization_id,
      v_appointment.person_id,
      p_whatsapp
    );
  end if;

  if exists (
    select 1
      from public.oh_people
     where organization_id = p_organization_id
       and whatsapp = p_whatsapp
       and active = true
  ) then
    raise exception 'WHATSAPP_IN_USE';
  end if;

  -- O terceiro ainda não possuía cadastro próprio. Cria a pessoa e passa a
  -- vinculá-la aos agendamentos que representam o mesmo terceiro do mesmo
  -- contato responsável. Esse é o mesmo conceito usado em
  -- oh_tucxa_consulente_relationships (owner + related_name).
  insert into public.oh_people (
    organization_id,
    full_name,
    whatsapp,
    active,
    notes,
    created_at,
    updated_at
  ) values (
    p_organization_id,
    v_person_name,
    p_whatsapp,
    true,
    'Cadastro criado pela Recepção ao informar WhatsApp próprio no Agendamento Piloto.',
    now(),
    now()
  )
  returning id into v_person_id;

  v_source_contact_person_id := v_appointment.source_contact_person_id;

  update public.oh_consulente_appointments appointment
     set metadata = coalesce(appointment.metadata, '{}'::jsonb)
       || jsonb_build_object(
            'contact_history',
            case
              when jsonb_typeof(appointment.metadata -> 'contact_history') = 'array'
                then appointment.metadata -> 'contact_history'
              else '[]'::jsonb
            end
            || jsonb_build_array(
                 jsonb_build_object(
                   'type', coalesce(appointment.notification_contact_type, ''),
                   'name', coalesce(appointment.notification_contact_name, ''),
                   'relationship', coalesce(appointment.notification_contact_relationship, ''),
                   'whatsapp', coalesce(appointment.notification_contact_whatsapp, ''),
                   'sourceContactPersonId', coalesce(appointment.source_contact_person_id::text, ''),
                   'changedAt', now(),
                   'reason', 'Consulente passou a utilizar WhatsApp próprio.'
                 )
               )
          ),
         person_id = v_person_id,
         whatsapp = p_whatsapp,
         notification_contact_type = 'consulente',
         notification_contact_name = v_person_name,
         notification_contact_relationship = null,
         notification_contact_whatsapp = p_whatsapp,
         source_contact_person_id = null,
         updated_at = now()
   where appointment.organization_id = p_organization_id
     and appointment.person_id is null
     and lower(btrim(appointment.consulente_name)) = lower(v_person_name)
     and (
       (v_source_contact_person_id is not null and appointment.source_contact_person_id = v_source_contact_person_id)
       or (v_source_contact_person_id is null and appointment.id = p_appointment_id)
     );

  get diagnostics v_count = row_count;

  -- Preserva também o vínculo familiar já cadastrado, agora apontando para a
  -- pessoa que ganhou cadastro próprio.
  if v_source_contact_person_id is not null then
    update public.oh_tucxa_consulente_relationships
       set related_person_id = v_person_id,
           updated_at = now()
     where organization_id = p_organization_id
       and owner_person_id = v_source_contact_person_id
       and lower(btrim(related_name)) = lower(v_person_name);
  end if;

  return v_count;
end;
$$;

comment on function public.oh_tucxa_pilot_adopt_own_whatsapp_by_appointment(uuid, uuid, text) is
  'Adota WhatsApp próprio a partir do agendamento, criando oh_people quando o terceiro ainda não possui cadastro próprio e preservando o histórico do contato responsável.';

revoke all on function public.oh_tucxa_pilot_adopt_own_whatsapp_by_appointment(uuid, uuid, text) from public;
revoke all on function public.oh_tucxa_pilot_adopt_own_whatsapp_by_appointment(uuid, uuid, text) from anon;
revoke all on function public.oh_tucxa_pilot_adopt_own_whatsapp_by_appointment(uuid, uuid, text) from authenticated;
grant execute on function public.oh_tucxa_pilot_adopt_own_whatsapp_by_appointment(uuid, uuid, text) to service_role;
