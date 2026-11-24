-- Somente leitura: executar após migrar AG28.
SELECT column_name,data_type,column_default FROM information_schema.columns
WHERE table_schema='public' AND table_name='oh_tucxa_consulente_relationships' AND column_name='active';
SELECT approval_status,active,count(*) quantidade FROM public.oh_tucxa_consulente_relationships
GROUP BY approval_status,active ORDER BY approval_status,active;
SELECT organization_id,owner_person_id,related_person_id,count(*) quantidade
FROM public.oh_tucxa_consulente_relationships WHERE related_person_id IS NOT NULL AND active=true
GROUP BY organization_id,owner_person_id,related_person_id HAVING count(*) > 1;
SELECT status,count(*) FROM public.oh_tucxa_link_requests GROUP BY status ORDER BY status;
SELECT event_type,channel,status,count(*) FROM public.oh_tucxa_ag28_event_dispatches
GROUP BY event_type,channel,status ORDER BY event_type,channel,status;
