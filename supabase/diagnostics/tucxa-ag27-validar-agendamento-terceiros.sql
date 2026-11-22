-- AG27: somente leitura. Nao exibe telefones, hashes nem dados pessoais.
SELECT approval_status, COUNT(*) AS total_vinculos,
       COUNT(*) FILTER (WHERE related_person_id IS NULL) AS sem_identidade
FROM public.oh_tucxa_consulente_relationships
GROUP BY approval_status ORDER BY approval_status;

SELECT COUNT(*) AS agendamentos_de_terceiros,
       COUNT(*) FILTER (WHERE notification_contact_type = 'alternate') AS pelo_responsavel,
       COUNT(*) FILTER (WHERE notification_contact_type = 'consulente') AS pelo_destinatario
FROM public.oh_consulente_appointments
WHERE scheduled_by_person_id IS NOT NULL
  AND scheduled_by_person_id IS DISTINCT FROM person_id;

SELECT conname, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conname = 'oh_tucxa_relationship_approval_status_check';
