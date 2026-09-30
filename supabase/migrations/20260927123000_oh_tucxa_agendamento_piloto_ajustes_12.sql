-- Organização em Harmonia / TUCXA
-- Agendamento — Ajustes 12 (27/09/2026)
--
-- Preferência individual da Recepção para abrir o Acolhimento automaticamente
-- após o login. O padrão é habilitado para refletir o fluxo solicitado no piloto.

alter table if exists public.oh_tucxa_pilot_person_preferences
  add column if not exists reception_open_acolhimento_on_login boolean not null default true;

comment on column public.oh_tucxa_pilot_person_preferences.reception_open_acolhimento_on_login is
  'Quando true, abre automaticamente o Acolhimento na próxima data do piloto após o login da pessoa da Recepção.';
