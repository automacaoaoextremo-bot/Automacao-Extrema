-- Limpeza de base para novos testes do Diagnóstico AE.
-- Preserva as soluções cadastradas em public.ae_solutions.
-- Apaga leads, respostas, matches e follow-ups gerados nos testes.

begin;

-- Conferência antes da limpeza.
select 'antes_ae_lead_followups' as tabela, count(*) as total from public.ae_lead_followups
union all
select 'antes_ae_solution_matches', count(*) from public.ae_solution_matches
union all
select 'antes_ae_lead_answers', count(*) from public.ae_lead_answers
union all
select 'antes_ae_leads', count(*) from public.ae_leads;

delete from public.ae_lead_followups;
delete from public.ae_solution_matches;
delete from public.ae_lead_answers;
delete from public.ae_leads;

-- Opcional: garante que as soluções continuem ativas para novos testes.
update public.ae_solutions
set is_active = true,
    updated_at = now()
where is_active is distinct from true;

-- Conferência depois da limpeza.
select 'depois_ae_lead_followups' as tabela, count(*) as total from public.ae_lead_followups
union all
select 'depois_ae_solution_matches', count(*) from public.ae_solution_matches
union all
select 'depois_ae_lead_answers', count(*) from public.ae_lead_answers
union all
select 'depois_ae_leads', count(*) from public.ae_leads
union all
select 'solucoes_preservadas', count(*) from public.ae_solutions;

commit;
