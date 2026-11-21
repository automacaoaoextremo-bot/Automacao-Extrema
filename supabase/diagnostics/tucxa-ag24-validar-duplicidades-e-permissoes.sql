-- Somente leitura: localizar conflitos historicos sem alterar dados.
SELECT a.organization_id, a.person_id, a.appointment_date, COUNT(*) AS agendamentos_ativos
FROM public.oh_consulente_appointments a
JOIN public.oh_organizations o ON o.id = a.organization_id AND o.slug = 'tucxa'
WHERE a.person_id IS NOT NULL
  AND a.status IN ('solicitado','confirmado','aprovado','presente','concluido')
GROUP BY a.organization_id, a.person_id, a.appointment_date
HAVING COUNT(*) > 1
ORDER BY a.appointment_date DESC;

SELECT e.id, e.name, e.active, e.appointment_enabled,
  e.pilot_accepts_first_time_transfers, e.pilot_allows_nondefault_booking
FROM public.oh_spiritual_entities e
JOIN public.oh_organizations o ON o.id = e.organization_id AND o.slug = 'tucxa'
ORDER BY e.name;

SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.oh_consulente_appointments'::regclass
  AND tgname = 'trg_tucxa_ag24_prevent_duplicate_person_day';
