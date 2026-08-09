alter table public.oh_financial_settings
  add column if not exists finance_contact_name text,
  add column if not exists finance_whatsapp text;

comment on column public.oh_financial_settings.finance_contact_name is
  'Nome exibido do contato responsável pela Tesouraria/Financeiro para orientações aos Filhos da Corrente.';

comment on column public.oh_financial_settings.finance_whatsapp is
  'WhatsApp da Tesouraria/Financeiro usado em orientações sobre contribuições e comprovantes já enviados.';
