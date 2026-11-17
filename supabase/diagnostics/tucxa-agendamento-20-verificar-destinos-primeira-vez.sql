-- AG20 - Diagnostico SOMENTE LEITURA (nao altera dados).
-- Altere a data abaixo para a data do atendimento que sera testado.
-- Confirme no Supabase o projeto correto antes de executar.
WITH parametros AS (
  SELECT DATE '2026-11-17' AS data_atendimento,
         'terca'::text AS dia_semana,
         ((EXTRACT(DAY FROM DATE '2026-11-17')::int - 1) / 7 + 1) AS ocorrencia
),
agenda AS (
  SELECT s.entity_id, MAX(s.default_capacity) AS capacidade_escala
  FROM public.oh_tucxa_pilot_entity_schedule s
  CROSS JOIN parametros p
  WHERE s.active IS TRUE AND s.weekday = p.dia_semana
    AND s.month_occurrence = p.ocorrencia
  GROUP BY s.entity_id
),
extra AS (
  SELECT DISTINCT ON (x.entity_id)
         x.entity_id, x.available, x.capacity, x.reason
  FROM public.oh_tucxa_pilot_entity_overrides x
  CROSS JOIN parametros p
  WHERE x.starts_on <= p.data_atendimento
    AND x.ends_on >= p.data_atendimento
  ORDER BY x.entity_id, x.created_at DESC
),
reservas AS (
  SELECT a.entity_id, COUNT(*) AS total
  FROM public.oh_consulente_appointments a
  CROSS JOIN parametros p
  WHERE a.appointment_date = p.data_atendimento
    AND a.status IN ('solicitado', 'confirmado', 'aprovado', 'presente', 'concluido')
  GROUP BY a.entity_id
)
SELECT
  p.data_atendimento,
  e.name AS entidade,
  e.active AS entidade_ativa,
  e.appointment_enabled AS aceita_agendamento,
  e.pilot_accepts_first_time_transfers AS aceita_troca_primeira_vez,
  (a.entity_id IS NOT NULL OR COALESCE(x.available, false)) AS consta_na_escala_ou_extraordinario,
  COALESCE(x.available, true) AS data_nao_bloqueada,
  COALESCE(x.capacity, a.capacidade_escala, e.daily_capacity, 4) AS capacidade_prevista,
  COALESCE(r.total, 0) AS agendamentos_ativos,
  GREATEST(0, COALESCE(x.capacity, a.capacidade_escala, e.daily_capacity, 4) - COALESCE(r.total, 0)) AS vagas_estimadas
FROM public.oh_spiritual_entities e
CROSS JOIN parametros p
LEFT JOIN agenda a ON a.entity_id = e.id
LEFT JOIN extra x ON x.entity_id = e.id
LEFT JOIN reservas r ON r.entity_id = e.id
WHERE e.name IS NOT NULL
ORDER BY e.pilot_accepts_first_time_transfers DESC, e.name;
