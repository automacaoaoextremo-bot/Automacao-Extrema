-- TUCXA / Agendamentos 09 - leitura antes de qualquer alteração.
-- Executar no SQL Editor do Supabase (ambiente escolhido).
-- NÃO modifica dados.
WITH org AS (
 SELECT id, slug, name FROM public.oh_organizations
 WHERE slug = 'tucxa' OR name ILIKE '%tucxa%'
), contact AS (
 SELECT p.id, p.organization_id, p.full_name, p.email, p.active,
   regexp_replace(coalesce(p.whatsapp,''),'[^0-9]','','g') AS phone_raw,
   regexp_replace(coalesce(p.normalized_whatsapp,''),'[^0-9]','','g') AS phone_normalized
 FROM public.oh_people p JOIN org ON org.id = p.organization_id
 WHERE regexp_replace(coalesce(p.whatsapp,''),'[^0-9]','','g') IN ('19989045150','5519989045150')
 OR regexp_replace(coalesce(p.normalized_whatsapp,''),'[^0-9]','','g') IN ('19989045150','5519989045150')
)
SELECT o.id AS organization_id, o.slug, c.id AS person_id, c.full_name,
       c.email, c.active, c.phone_raw, c.phone_normalized,
       m.id AS membership_id, m.status, m.active AS membership_active,
       m.agenda_viva_profile -> 'functionSlugs' AS functions,
       m.agenda_viva_profile -> 'receptionSchedule' AS reception_schedule
FROM org o LEFT JOIN contact c ON c.organization_id = o.id
LEFT JOIN public.oh_memberships m ON m.organization_id = o.id AND m.person_id = c.id
ORDER BY c.id, m.id;

SELECT organization_id, module_slug,
       settings -> 'pilotReceptionAdditionalRecipients' AS recipients
FROM public.oh_module_settings
WHERE module_slug = 'atendimento-em-harmonia'
  AND organization_id IN (SELECT id FROM public.oh_organizations WHERE slug = 'tucxa');
