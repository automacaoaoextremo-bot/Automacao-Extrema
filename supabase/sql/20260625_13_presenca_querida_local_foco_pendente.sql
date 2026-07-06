-- Ajustes pontuais do Presença Querida / Daniela 50 anos
-- 1) Corrige endereço exibido do evento no banco para Valinhos, SP.
-- 2) O foco padrão de pendentes é tratado no componente público de confirmação.

update pq_events
set
  address = 'Valinhos, SP',
  city = 'Valinhos',
  state = 'SP'
where slug in ('daniela-50-anos', 'daniela-50-anos-demo');
