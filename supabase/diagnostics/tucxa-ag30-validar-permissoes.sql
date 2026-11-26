-- TUCXA AG30 - DIAGNOSTICO SOMENTE LEITURA. Executar apos migracao.
SELECT 'tucxa_ag30_column_entity' AS teste,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
         AND table_name='oh_spiritual_entities' AND column_name='pilot_allows_same_day_booking') AS ok;
SELECT 'tucxa_ag30_column_person' AS teste,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
         AND table_name='oh_tucxa_pilot_person_preferences' AND column_name='allow_filho_corrente_booking') AS ok;
SELECT 'tucxa_ag30_function_booking' AS teste,
       to_regprocedure('public.oh_tucxa_pilot_reserve_appointment(uuid,uuid,uuid,date,uuid,text,text,text,text,text,text,timestamptz,text)') IS NOT NULL AS ok;
SELECT 'tucxa_ag30_trigger_duplicate' AS teste,
       EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_tucxa_ag24_prevent_duplicate_person_day' AND NOT tgisinternal) AS ok;
SELECT e.name,e.pilot_allows_same_day_booking,e.pilot_requires_companion_booking AS legado_ag29
FROM public.oh_spiritual_entities e JOIN public.oh_organizations o ON o.id=e.organization_id
WHERE o.slug='tucxa' AND e.active=true ORDER BY e.name;
SELECT p.full_name, pf.allow_filho_corrente_booking
FROM public.oh_tucxa_pilot_person_preferences pf
JOIN public.oh_people p ON p.id=pf.person_id AND p.organization_id=pf.organization_id
JOIN public.oh_organizations o ON o.id=pf.organization_id WHERE o.slug='tucxa'
AND pf.allow_filho_corrente_booking=true ORDER BY p.full_name;
-- Reservas duplicadas com a MESMA Entidade permanecem invalidas:
SELECT a.person_id,a.appointment_date,a.entity_id,count(*) AS quantidade
FROM public.oh_consulente_appointments a JOIN public.oh_organizations o ON o.id=a.organization_id
WHERE o.slug='tucxa' AND a.person_id IS NOT NULL
  AND a.status IN ('solicitado','confirmado','aprovado','presente','concluido')
GROUP BY 1,2,3 HAVING count(*)>1 ORDER BY 2;
-- Reservas multiplas na mesma data: conferir se as adicionais estao autorizadas.
SELECT a.person_id,a.appointment_date,count(*) AS total,
  string_agg(e.name || ' [perm=' || e.pilot_allows_same_day_booking::text || ']', ', ' ORDER BY a.created_at) AS entidades
FROM public.oh_consulente_appointments a JOIN public.oh_organizations o ON o.id=a.organization_id
JOIN public.oh_spiritual_entities e ON e.id=a.entity_id
WHERE o.slug='tucxa' AND a.person_id IS NOT NULL
  AND a.status IN ('solicitado','confirmado','aprovado','presente','concluido')
GROUP BY 1,2 HAVING count(*)>1 ORDER BY 2;
