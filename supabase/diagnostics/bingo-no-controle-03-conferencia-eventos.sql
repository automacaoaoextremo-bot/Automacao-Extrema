-- Executar APENAS no projeto de origem, em SQL Editor. Somente SELECT.
-- São dois eventos reais; evento test explicitamente excluído.
WITH included(id, owner_slug) AS (
  VALUES
  ('2bc80233-73f1-4ad4-b789-b9249d472ea4'::uuid, 'sementinha'),
  ('e7cc5ba7-8500-441f-ab3b-327ec1732e9b'::uuid, 'tucxa')
)
SELECT e.id, e.slug, e.name, e.event_date, e.status, i.owner_slug,
  (SELECT count(*) FROM public.rounds r WHERE r.event_day_id=e.id) AS rounds,
  (SELECT count(*) FROM public.draw_events d JOIN public.rounds r ON r.id=d.round_id WHERE r.event_day_id=e.id) AS draws,
  (SELECT count(*) FROM public.round_awards a JOIN public.rounds r ON r.id=a.round_id WHERE r.event_day_id=e.id) AS awards,
  (SELECT count(*) FROM public.winner_claims c JOIN public.rounds r ON r.id=c.round_id WHERE r.event_day_id=e.id) AS claims,
  (SELECT count(*) FROM public.winners w JOIN public.rounds r ON r.id=w.round_id WHERE r.event_day_id=e.id) AS winners
FROM public.event_days e JOIN included i ON i.id=e.id ORDER BY e.event_date;

-- Confira também se existem linhas com referências inconsistentes (sem alterar dados).
SELECT 'orphan_draws' AS check_name, count(*) AS total FROM public.draw_events d LEFT JOIN public.rounds r ON r.id=d.round_id WHERE r.id IS NULL
UNION ALL
SELECT 'orphan_awards', count(*) FROM public.round_awards a LEFT JOIN public.rounds r ON r.id=a.round_id WHERE r.id IS NULL
UNION ALL
SELECT 'orphan_claims', count(*) FROM public.winner_claims c LEFT JOIN public.rounds r ON r.id=c.round_id WHERE r.id IS NULL
UNION ALL
SELECT 'orphan_winners', count(*) FROM public.winners w LEFT JOIN public.rounds r ON r.id=w.round_id WHERE r.id IS NULL;
