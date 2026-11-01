-- Diagnóstico somente leitura após migração 05 (TUCXA).
SELECT 'preferencias' AS origem,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE p.allow_different_entity IS FALSE) AS restritos,
  COUNT(*) FILTER (WHERE p.allow_different_entity IS TRUE) AS permitidos
FROM public.oh_tucxa_pilot_person_preferences p
JOIN public.oh_organizations o ON o.id = p.organization_id AND o.slug = 'tucxa'
UNION ALL
SELECT 'pessoas_vinculadas', COUNT(*),
  COUNT(*) FILTER (WHERE r.allow_different_entity IS FALSE),
  COUNT(*) FILTER (WHERE r.allow_different_entity IS TRUE)
FROM public.oh_tucxa_consulente_relationships r
JOIN public.oh_organizations o ON o.id = r.organization_id AND o.slug = 'tucxa';

SELECT record_kind, COUNT(*) AS registros_anteriormente_restritos
FROM public.oh_tucxa_ag05_permissions_backup
WHERE organization_id = (SELECT id FROM public.oh_organizations WHERE slug = 'tucxa' LIMIT 1)
GROUP BY record_kind ORDER BY record_kind;
