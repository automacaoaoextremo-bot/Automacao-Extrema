-- Homologação StudyAgent V1 — Residência IA
-- Pode ser executado no SQL Editor após a migration.

select
  p.slug,
  p.name,
  p.active,
  count(distinct c.id) as competencias,
  count(distinct l.id) as niveis,
  count(distinct e.id) as arestas
from public.ae_study_programs p
left join public.ae_study_competencies c on c.program_id = p.id
left join public.ae_study_level_definitions l on l.program_id = p.id
left join public.ae_study_competency_edges e on e.program_id = p.id
where p.slug = 'residencia-ia'
group by p.slug, p.name, p.active;

-- Esperado: 25 competências, 4 níveis e 41 arestas.

select
  c.code,
  c.title,
  c.category,
  c.sort_order,
  c.reflection_sources
from public.ae_study_competencies c
join public.ae_study_programs p on p.id = c.program_id
where p.slug = 'residencia-ia'
order by c.sort_order;

-- Verifica se alguma aresta aponta para outro programa ou ficou órfã.
select count(*) as arestas_invalidas
from public.ae_study_competency_edges e
join public.ae_study_competencies cf on cf.id = e.from_competency_id
join public.ae_study_competencies ct on ct.id = e.to_competency_id
where e.program_id <> cf.program_id
   or e.program_id <> ct.program_id;

-- Esperado: 0.
