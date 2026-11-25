-- TUCXA AG29 / CONSULTAS SOMENTE LEITURA - Rodar apos migracao, primeiro em homologacao.
-- Resultado 1: devem aparecer Dr. Alexandre (segunda) e Dr. Augusto (terca) como true.
SELECT e.id, e.name, e.line, e.pilot_requires_companion_booking AS complemento_medico,
       e.pilot_allows_nondefault_booking AS permite_avulso
FROM public.oh_spiritual_entities e JOIN public.oh_organizations o ON o.id=e.organization_id
WHERE o.slug='tucxa' AND (e.pilot_requires_companion_booking OR e.name ~* '^dr[.]? *(alexandre|augusto)')
ORDER BY e.name;

-- Resultado 2: ZERO casos inconsistentes, caso não haja reservas antigas indevidas.
WITH ativos AS (
 SELECT a.organization_id,a.person_id,a.appointment_date,
        count(*) AS total,
        count(*) FILTER (WHERE e.pilot_requires_companion_booking) AS medicos,
        count(*) FILTER (WHERE NOT e.pilot_requires_companion_booking) AS regulares
 FROM public.oh_consulente_appointments a
 JOIN public.oh_organizations o ON o.id=a.organization_id AND o.slug='tucxa'
 JOIN public.oh_spiritual_entities e ON e.id=a.entity_id
 WHERE a.person_id IS NOT NULL AND a.status IN ('solicitado','confirmado','aprovado','presente','concluido')
 GROUP BY 1,2,3
)
SELECT * FROM ativos WHERE total>2 OR medicos>1 OR regulares>1 OR (medicos=1 AND regulares<>1)
ORDER BY appointment_date DESC LIMIT 100;

-- Resultado 3: ZERO chegadas com ordem duplicada dentro da mesma Entidade/data.
SELECT a.organization_id,a.appointment_date,a.entity_id,a.arrival_order,count(*) AS quantidade
FROM public.oh_consulente_appointments a JOIN public.oh_organizations o ON o.id=a.organization_id AND o.slug='tucxa'
WHERE a.arrival_status='arrived' AND a.arrival_order IS NOT NULL AND a.status<>'cancelado'
GROUP BY 1,2,3,4 HAVING count(*)>1;

-- Resultado 4: nenhum autovínculo.
SELECT r.id,r.owner_person_id,r.related_person_id
FROM public.oh_tucxa_consulente_relationships r JOIN public.oh_organizations o ON o.id=r.organization_id AND o.slug='tucxa'
WHERE r.owner_person_id=r.related_person_id;

-- Resultado 5: registrar presença dos gatilhos e funções.
SELECT tgname,tgenabled FROM pg_trigger
WHERE tgrelid='public.oh_consulente_appointments'::regclass
 AND tgname IN ('trg_tucxa_ag24_prevent_duplicate_person_day','trg_tucxa_ag29_transfer_arrival_order')
ORDER BY tgname;
SELECT proname,pg_get_function_identity_arguments(oid) AS parametros
FROM pg_proc WHERE pronamespace='public'::regnamespace
 AND proname IN ('oh_tucxa_ag29_delete_relationship','oh_tucxa_pilot_reserve_appointment','tucxa_ag29_transfer_arrival_order')
ORDER BY proname;
