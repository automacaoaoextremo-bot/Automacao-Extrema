-- OeH / TUCXA - Agendamento piloto - Ajustes 41
-- Controle explícito dos Cavalinhos que podem receber avisos operacionais.
-- Regra de implantação: todos iniciam desabilitados para homologação segura.

alter table public.oh_spiritual_entities
  add column if not exists pilot_cavalinho_whatsapp_enabled boolean not null default false;

update public.oh_spiritual_entities
set pilot_cavalinho_whatsapp_enabled = false
where pilot_cavalinho_whatsapp_enabled is distinct from false;

comment on column public.oh_spiritual_entities.pilot_cavalinho_whatsapp_enabled is
  'Piloto TUCXA: autoriza envio de avisos operacionais de agendamentos ao Cavalinho associado. Default false durante homologação.';
