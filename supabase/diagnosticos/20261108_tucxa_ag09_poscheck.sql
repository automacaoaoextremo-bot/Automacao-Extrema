-- Somente leitura. Conferência pós-instalação do Agendamentos 09.
WITH tucxa AS (SELECT id FROM public.oh_organizations WHERE slug = 'tucxa'),
 person AS (
 SELECT p.* FROM public.oh_people p JOIN tucxa t ON p.organization_id=t.id
 WHERE regexp_replace(coalesce(p.whatsapp,''),'[^0-9]','','g') IN ('19989045150','5519989045150')
    OR regexp_replace(coalesce(p.normalized_whatsapp,''),'[^0-9]','','g') IN ('19989045150','5519989045150'))
SELECT p.id, p.full_name, p.email, p.active, m.active AS membership_active,
 m.status AS membership_status,
 m.agenda_viva_profile->'functionSlugs' AS functions,
 m.agenda_viva_profile->'receptionSchedule' AS reception_schedule,
 s.settings->'pilotReceptionAdditionalRecipients' AS additional_recipients
FROM person p JOIN public.oh_memberships m ON m.organization_id=p.organization_id AND m.person_id=p.id
JOIN public.oh_module_settings s ON s.organization_id=p.organization_id AND s.module_slug='atendimento-em-harmonia';

SELECT dispatch_date, phase, recipient_email, status, sent_at, error
FROM public.oh_tucxa_pilot_reception_email_dispatches
WHERE recipient_email='tucxacentro@gmail.com'
ORDER BY dispatch_date DESC, phase DESC LIMIT 20;
