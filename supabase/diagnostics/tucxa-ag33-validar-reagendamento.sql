-- AG33: diagnostico somente leitura, antes e depois da migration.
WITH defs AS (
  SELECT pg_get_functiondef(to_regprocedure('public.oh_tucxa_pilot_reschedule_appointment(uuid,uuid,uuid,uuid,date,text,timestamptz)')) AS rpc,
         pg_get_functiondef(to_regprocedure('public.tucxa_ag24_prevent_duplicate_person_day()')) AS guard
)
SELECT
  coalesce(position('PILOT_MAX_TWO_PERSON_DATE' in guard)>0
    AND position('v_existing_authorized' in guard)>0,false) AS gatilho_ag31,
  EXISTS (SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid=to_regclass('public.oh_consulente_appointments')
      AND t.tgname='trg_tucxa_ag24_prevent_duplicate_person_day'
      AND t.tgfoid=to_regprocedure('public.tucxa_ag24_prevent_duplicate_person_day()')
      AND t.tgenabled IN ('O','A')) AS gatilho_habilitado,
  coalesce(position('AG33: mesma politica AG31' in rpc)>0
    AND position('PILOT_MAX_TWO_PERSON_DATE' in rpc)>0
    AND position('PILOT_DUPLICATE_SAME_ENTITY' in rpc)>0
    AND position('pilot_allows_same_day_booking' in rpc)>0,false) AS reagendamento_ag33,
  coalesce(position('IF a.person_id IS NOT NULL AND EXISTS (' in rpc)>0,false) AS bloqueio_antigo,
  has_function_privilege('service_role',
    to_regprocedure('public.oh_tucxa_pilot_reschedule_appointment(uuid,uuid,uuid,uuid,date,text,timestamptz)'), 'EXECUTE') AS service_role_execute
FROM defs;

-- Conferencia da definicao efetiva, sem expor registros de consulentes.
SELECT pg_get_functiondef(to_regprocedure('public.oh_tucxa_pilot_reschedule_appointment(uuid,uuid,uuid,uuid,date,text,timestamptz)')) AS definicao_reagendamento;
