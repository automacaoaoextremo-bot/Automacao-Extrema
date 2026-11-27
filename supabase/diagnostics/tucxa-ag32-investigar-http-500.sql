-- TUCXA AG32 - SOMENTE LEITURA. Rodar no mesmo projeto Supabase do erro.
-- NAO tenta inserir reservas, nao altera pacientes nem configura Entidades.
-- Execute os blocos separadamente e salve os resultados (sem telefone/nome completo).

-- 1. Identificar banco, funcao e versao efetiva (considera SOBRECARGAS).
SELECT current_database() AS database_name,
       p.oid::regprocedure::text AS assinatura,
       (pg_get_functiondef(p.oid) LIKE '%PILOT_MAX_TWO_PERSON_DATE%') AS contem_limite_duas,
       (pg_get_functiondef(p.oid) LIKE '%v_existing_authorized%') AS permite_outra_entidade,
       (pg_get_functiondef(p.oid) LIKE '%PILOT_DUPLICATE_SAME_ENTITY%') AS impede_repetir_entidade
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('oh_tucxa_pilot_reserve_appointment','tucxa_ag24_prevent_duplicate_person_day')
ORDER BY assinatura;

-- 2. Gatilhos de duplicidade e habilitacao (esperado = tgenabled 'O').
SELECT t.tgname, t.tgenabled, t.tgfoid::regprocedure::text AS executa_funcao,
       pg_get_triggerdef(t.oid) AS definicao
FROM pg_trigger t
WHERE t.tgrelid='public.oh_consulente_appointments'::regclass
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- 3. Restricoes e indices UNIQUE sobre agendamentos (podem impedir a segunda reserva).
SELECT 'constraint' AS tipo, c.conname AS nome,
       pg_get_constraintdef(c.oid) AS definicao
FROM pg_constraint c
WHERE c.conrelid='public.oh_consulente_appointments'::regclass
UNION ALL
SELECT 'index' AS tipo, indexname AS nome, indexdef AS definicao
FROM pg_indexes
WHERE schemaname='public' AND tablename='oh_consulente_appointments'
  AND indexdef ILIKE '%unique%'
ORDER BY tipo, nome;

-- 4. Verificar existencia da flag AG30/AG31 (nao falha se a coluna ainda nao existir).
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='oh_spiritual_entities'
  AND column_name='pilot_allows_same_day_booking';

-- 5. Conferir se a Entidade configurada esta mesmo autorizada no banco ativo.
-- REQUER que a consulta 4 tenha retornado a coluna acima.
SELECT e.id AS entidade_id, e.name AS entidade,
       e.active, e.appointment_enabled,
       e.pilot_allows_same_day_booking AS permite_outra_entidade
FROM public.oh_spiritual_entities e
JOIN public.oh_organizations o ON o.id=e.organization_id
WHERE o.slug='tucxa' AND e.name ILIKE '%Alexandre%'
ORDER BY e.name;

-- 6. Contagens por pessoa e data sem exibir nome ou WhatsApp.
-- SUBSTITUA 00000000000 pelo telefone somente NO SEU SQL EDITOR.
-- Nao compartilhe o resultado completo sem anonimizar IDs.
WITH alvo AS (
  SELECT p.id AS person_id, p.organization_id
  FROM public.oh_people p
  JOIN public.oh_organizations o ON o.id=p.organization_id AND o.slug='tucxa'
  WHERE right(regexp_replace(coalesce(p.normalized_whatsapp,p.whatsapp,''), '[^0-9]', '', 'g'),11)
        = '00000000000'
)
SELECT a.appointment_date, a.status, e.name AS entidade,
       e.pilot_allows_same_day_booking AS permite_outra_entidade,
       count(*) AS reservas
FROM public.oh_consulente_appointments a
JOIN alvo p ON p.organization_id=a.organization_id AND p.person_id=a.person_id
LEFT JOIN public.oh_spiritual_entities e ON e.id=a.entity_id
WHERE a.appointment_date='2026-12-07'
GROUP BY a.appointment_date,a.status,e.name,e.pilot_allows_same_day_booking
ORDER BY e.name,a.status;

-- 7. Status das migracoes (somente se a tabela existir no Supabase em questao).
-- Execute separadamente, pois os esquemas/permissoes podem variar:
-- SELECT version,name FROM supabase_migrations.schema_migrations
-- WHERE version IN ('20261126153000','20261126193000') ORDER BY version;
