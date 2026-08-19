-- TUCXA / Cursos em Harmonia — Ajustes e Evoluções 09
-- Permite copiar a estrutura pedagógica de um curso mantendo as datas das
-- aulas em branco até que o novo cronograma seja planejado.
--
-- A constraint (ends_at > starts_at) continua válida: em PostgreSQL uma
-- expressão com NULL não viola CHECK. Ao salvar/editar uma aula pela API,
-- início e fim continuam obrigatórios e são validados antes da persistência.

alter table if exists public.oh_course_lessons
  alter column starts_at drop not null,
  alter column ends_at drop not null;

comment on column public.oh_course_lessons.starts_at is
  'Início da aula. Pode ser NULL apenas enquanto a aula copiada aguarda novo planejamento de data.';

comment on column public.oh_course_lessons.ends_at is
  'Fim da aula. Pode ser NULL apenas enquanto a aula copiada aguarda novo planejamento de data.';
