-- TUCXA / Ajuste 77
-- CORREÇÃO CONTROLADA - FRANCISCA ELIZIANE - 19/10/2026
--
-- IMPORTANTE:
-- 1) Execute antes:
--    supabase/diagnostics/tucxa-agendamento-77-diagnostico-regra-e-dados.sql
-- 2) Copie o appointment_id EXATO da Francisca na consulta 2.
-- 3) Substitua o UUID zero abaixo.
-- 4) O script possui várias travas e termina em ROLLBACK por padrão.
-- 5) Somente após conferir o SELECT final, troque ROLLBACK por COMMIT.
--
-- A correção NÃO apaga o histórico de troca de Entidade.
-- Em vez disso, registra no metadata que a classificação "Primeira Vez"
-- foi corrigida. O código do Ajuste 77 ignora o histórico antigo de Primeira
-- Vez para um appointment explicitamente corrigido.

begin;

do $$
declare
  v_organization_id constant uuid := 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid;
  -- PREENCHA APÓS O DIAGNÓSTICO:
  v_appointment_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;

  v_person_id uuid;
  v_entity_id uuid;
  v_entity_name text;
  v_consulente_name text;
  v_appointment_date date;
  v_metadata jsonb;
begin
  if v_appointment_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception using message = 'AJUSTE77_PREENCHA_APPOINTMENT_ID_FRANCISCA';
  end if;

  select
    a.person_id,
    a.entity_id,
    a.consulente_name,
    a.appointment_date,
    coalesce(a.metadata, '{}'::jsonb)
  into
    v_person_id,
    v_entity_id,
    v_consulente_name,
    v_appointment_date,
    v_metadata
  from public.oh_consulente_appointments a
  where a.organization_id = v_organization_id
    and a.id = v_appointment_id
  for update;

  select e.name
    into v_entity_name
  from public.oh_spiritual_entities e
  where e.organization_id = v_organization_id
    and e.id = v_entity_id;

  if v_person_id is null then
    raise exception using message = 'AJUSTE77_FRANCISCA_PERSON_ID_AUSENTE';
  end if;

  if v_appointment_date <> date '2026-10-19' then
    raise exception using message = 'AJUSTE77_DATA_DIVERGENTE';
  end if;

  if lower(regexp_replace(trim(coalesce(v_consulente_name, '')), '\s+', ' ', 'g')) <> 'francisca eliziane' then
    raise exception using message = 'AJUSTE77_CONSULENTE_DIVERGENTE';
  end if;

  if regexp_replace(
       lower(coalesce(v_entity_name, '')),
       '[^a-z0-9]+',
       '',
       'g'
     ) not like '%madreantonieta%' then
    raise exception using message = 'AJUSTE77_ENTIDADE_ATUAL_NAO_E_MADRE_ANTONIETA';
  end if;

  if coalesce(v_metadata ->> 'firstTimeAppointment', '') <> 'true'
     and coalesce(v_metadata ->> 'firstTimeIndicatorActive', '') <> 'true' then
    raise exception using message = 'AJUSTE77_AGENDAMENTO_NAO_ESTA_MARCADO_COMO_PRIMEIRA_VEZ';
  end if;

  update public.oh_consulente_appointments
  set
    metadata =
      (
        coalesce(metadata, '{}'::jsonb)
        - 'firstTimeAppointment'
        - 'firstTimeIndicatorActive'
        - 'firstTimeOriginalEntityId'
        - 'firstTimeOriginalEntityName'
        - 'firstTimeMarkedAt'
        - 'firstTimeIndicatorClosedAt'
        - 'firstTimeIndicatorClosedByAppointmentId'
      )
      || jsonb_build_object(
        'firstTimeClassificationCorrected', true,
        'firstTimeClassificationCorrectedAt', now()::text,
        'firstTimeClassificationCorrectionReason',
          'Já havia passado com Madre Antonieta antes da implantação do Agendamento Piloto.'
      ),
    updated_at = now()
  where organization_id = v_organization_id
    and id = v_appointment_id;

  insert into public.oh_tucxa_pilot_person_preferences (
    organization_id,
    person_id,
    default_entity_id,
    updated_at
  )
  values (
    v_organization_id,
    v_person_id,
    v_entity_id,
    now()
  )
  on conflict (organization_id, person_id)
  do update set
    default_entity_id = excluded.default_entity_id,
    updated_at = now();

  -- Remove somente a flag antiga criada pela regra abandonada do Ajuste 67.
  update public.oh_memberships
  set
    agenda_viva_profile = coalesce(agenda_viva_profile, '{}'::jsonb) - 'firstAppointmentMustBeFirstTime',
    updated_at = now()
  where organization_id = v_organization_id
    and person_id = v_person_id
    and active = true;
end;
$$;

-- Conferência antes do COMMIT.
select
  a.id as appointment_id,
  a.person_id,
  a.consulente_name,
  a.appointment_date,
  e.name as entidade_atual,
  a.metadata,
  pref.default_entity_id,
  ep.name as entidade_padrao
from public.oh_consulente_appointments a
left join public.oh_spiritual_entities e
  on e.id = a.entity_id
 and e.organization_id = a.organization_id
left join public.oh_tucxa_pilot_person_preferences pref
  on pref.organization_id = a.organization_id
 and pref.person_id = a.person_id
left join public.oh_spiritual_entities ep
  on ep.id = pref.default_entity_id
 and ep.organization_id = a.organization_id
where a.organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and a.appointment_date = date '2026-10-19'
  and lower(regexp_replace(trim(coalesce(a.consulente_name, '')), '\s+', ' ', 'g')) = 'francisca eliziane';

-- SEGURANÇA: por padrão não aplica.
rollback;

-- Após conferir:
-- substitua a linha acima por COMMIT e execute novamente o arquivo.
