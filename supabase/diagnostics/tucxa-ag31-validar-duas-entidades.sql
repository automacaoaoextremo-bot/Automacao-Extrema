-- TUCXA AG31 - DIAGNOSTICO SOMENTE LEITURA (execucao apos migracao)
-- Nao modifica dados. Revise os casos antes de habilitar permissao em producao.

-- 1. Configuracoes das Entidades ativas do TUCXA.
SELECT o.slug, e.id AS entidade_id, e.name AS entidade,
       e.pilot_allows_same_day_booking AS permite_combinar_outra_entidade
FROM public.oh_spiritual_entities e
JOIN public.oh_organizations o ON o.id=e.organization_id
WHERE o.slug='tucxa' AND e.active=true
ORDER BY e.name;

-- 2. Duplicidades ativas na MESMA Entidade (sempre indevidas).
SELECT a.organization_id, a.person_id, a.appointment_date, a.entity_id,
       count(*) AS total, array_agg(a.id ORDER BY a.id) AS ids
FROM public.oh_consulente_appointments a
JOIN public.oh_organizations o ON o.id=a.organization_id AND o.slug='tucxa'
WHERE a.person_id IS NOT NULL AND a.status IN ('solicitado','confirmado','aprovado','presente','concluido')
GROUP BY a.organization_id,a.person_id,a.appointment_date,a.entity_id
HAVING count(*)>1
ORDER BY a.appointment_date DESC;

-- 3. Dias com 2+ reservas: identificar mais de duas ou duas sem Entidade autorizada.
WITH diary AS (
 SELECT a.organization_id,a.person_id,a.appointment_date,
   count(*) AS total,
   count(DISTINCT a.entity_id) AS distintas,
   coalesce(bool_or(coalesce(e.pilot_allows_same_day_booking,false)),false) AS autorizada,
   string_agg(e.name, ' / ' ORDER BY e.name) AS entidades
 FROM public.oh_consulente_appointments a
 JOIN public.oh_organizations o ON o.id=a.organization_id AND o.slug='tucxa'
 LEFT JOIN public.oh_spiritual_entities e ON e.id=a.entity_id AND e.organization_id=a.organization_id
 WHERE a.person_id IS NOT NULL AND a.status IN ('solicitado','confirmado','aprovado','presente','concluido')
 GROUP BY a.organization_id,a.person_id,a.appointment_date
 HAVING count(*)>=2
)
SELECT * FROM diary
WHERE total>2 OR distintas<total OR NOT autorizada
ORDER BY appointment_date DESC;

-- 4. Conferir se RPC e trigger foram atualizados (marcadores AG31).
SELECT proname, pg_get_functiondef(p.oid) LIKE '%PILOT_MAX_TWO_PERSON_DATE%' AS regra_limite_dois,
       pg_get_functiondef(p.oid) LIKE '%v_existing_authorized%' AS checa_ambas_entidades
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND proname IN (
  'oh_tucxa_pilot_reserve_appointment',
  'tucxa_ag24_prevent_duplicate_person_day'
)
ORDER BY proname;

-- 5. Gatilho de duplicidade habilitado.
SELECT t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) AS definicao
FROM pg_trigger t
WHERE t.tgrelid='public.oh_consulente_appointments'::regclass
 AND t.tgname='trg_tucxa_ag24_prevent_duplicate_person_day';
