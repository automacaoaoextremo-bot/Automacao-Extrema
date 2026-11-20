-- DIAGNÓSTICO DE LEITURA — executar SOMENTE no banco de origem.
-- A revisão humana por ID determina quais eventos são reais e quais são testes.
select e.id, e.slug, e.name, e.event_date, e.status,
       count(distinct r.id) as rodadas,
       count(distinct d.id) as sorteios,
       count(distinct a.id) as premiacoes,
       count(distinct wc.id) as reivindicacoes,
       count(distinct w.id) as vencedores
from public.event_days e
left join public.rounds r on r.event_day_id=e.id
left join public.draw_events d on d.round_id=r.id
left join public.round_awards a on a.round_id=r.id
left join public.winner_claims wc on wc.round_id=r.id
left join public.winners w on w.round_id=r.id
group by e.id,e.slug,e.name,e.event_date,e.status
order by e.event_date,e.name;
