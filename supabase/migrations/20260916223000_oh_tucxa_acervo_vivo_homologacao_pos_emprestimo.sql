-- TUCXA / Acervo Vivo - Ajustes 03
-- Vincula a homologacao opcional respondida pelo proprio participante ao emprestimo concluido.

begin;

alter table public.oh_acervo_homologations
  add column if not exists loan_id uuid references public.oh_acervo_loans(id) on delete set null;

create index if not exists idx_oh_acervo_homologations_loan
  on public.oh_acervo_homologations (organization_id, loan_id)
  where loan_id is not null;

create unique index if not exists ux_oh_acervo_homologations_one_per_loan
  on public.oh_acervo_homologations (organization_id, loan_id)
  where loan_id is not null;

commit;
