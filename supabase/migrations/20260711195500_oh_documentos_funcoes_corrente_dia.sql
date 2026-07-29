-- Organização em Harmonia / Tucxa
-- Cadastros editáveis para documentos, seções, responsabilidades de funções
-- e preparação dos vínculos Cavalinho x Entidade.

create table if not exists public.oh_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  document_type text default 'orientacao',
  audience text[] default array['filhos-corrente']::text[],
  source_file_name text,
  public_url text,
  active boolean default true,
  sort_order integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organization_id, slug)
);

create table if not exists public.oh_document_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  document_id uuid not null references public.oh_documents(id) on delete cascade,
  slug text not null,
  title text not null,
  body text not null,
  audience text[] default array['filhos-corrente']::text[],
  related_module_slug text,
  related_role_slug text,
  active boolean default true,
  sort_order integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (document_id, slug)
);

alter table if exists public.oh_roles
  add column if not exists responsibilities jsonb default '[]'::jsonb,
  add column if not exists recommended_permissions jsonb default '[]'::jsonb,
  add column if not exists guidance text;

alter table if exists public.oh_spiritual_entities
  add column if not exists description text,
  add column if not exists attends_consulentes boolean default false,
  add column if not exists primary_medium_person_id uuid references public.oh_people(id) on delete set null;

create table if not exists public.oh_person_entity_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  person_id uuid not null references public.oh_people(id) on delete cascade,
  entity_id uuid not null references public.oh_spiritual_entities(id) on delete cascade,
  relationship_type text not null default 'cavalinho',
  is_primary_for_attendance boolean default false,
  active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organization_id, person_id, entity_id, relationship_type)
);

create table if not exists public.oh_contribution_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  module_slug text not null default 'corrente-em-dia',
  contribution_type text not null,
  title text not null,
  description text,
  suggested_amount numeric(12,2),
  allow_custom_amount boolean default true,
  allow_anonymous boolean default false,
  recurrence text default 'pontual',
  payment_methods text[] default array['pix']::text[],
  active boolean default true,
  sort_order integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organization_id, module_slug, contribution_type)
);

do $$
declare
  tucxa_id uuid;
  doc_regulamento uuid;
  doc_procedimentos uuid;
  doc_cambonos uuid;
begin
  select id into tucxa_id from public.oh_organizations where slug = 'tucxa' limit 1;

  if tucxa_id is null then
    return;
  end if;

  insert into public.oh_documents (organization_id, slug, title, summary, document_type, source_file_name, sort_order)
  values
    (tucxa_id, 'regulamento-tucxa-2025', 'Regulamento do Tucxa 2025', 'Horários, grupos, conduta, presença, comunicação oficial, eventos, biblioteca e regras gerais da casa.', 'regulamento', 'REGULAMENTO_DO_TUCXA_2025.pdf', 10),
    (tucxa_id, 'procedimentos-orientacoes-basicas-2025', 'Procedimentos e Orientações Básicas 2025', 'Preparo material, alimentação, vestuário, banho de defesa, entrada no terreiro, silêncio, estudos e responsabilidade mediúnica.', 'procedimento', 'PROCEDIMENTOS _DO_TUCXA_2025.pdf', 20),
    (tucxa_id, 'manual-cambonos-2025', 'Manual para Cambonos 2025', 'Responsabilidades do Cambono, sigilo, anotações, apoio ao consulente, comunicação com coordenação e retorno obrigatório.', 'manual', 'MANUAL CAMBONOS 2025.pdf', 30)
  on conflict (organization_id, slug) do update set
    title = excluded.title,
    summary = excluded.summary,
    document_type = excluded.document_type,
    source_file_name = excluded.source_file_name,
    sort_order = excluded.sort_order,
    updated_at = now();

  select id into doc_regulamento from public.oh_documents where organization_id = tucxa_id and slug = 'regulamento-tucxa-2025';
  select id into doc_procedimentos from public.oh_documents where organization_id = tucxa_id and slug = 'procedimentos-orientacoes-basicas-2025';
  select id into doc_cambonos from public.oh_documents where organization_id = tucxa_id and slug = 'manual-cambonos-2025';

  insert into public.oh_document_sections (organization_id, document_id, slug, title, body, related_module_slug, related_role_slug, sort_order)
  values
    (tucxa_id, doc_regulamento, 'horarios-trabalhos', 'Horários e distribuição dos trabalhos', 'Segundas e terças: atendimento aos Filhos de Fora/Consulentes das 18h às 22h. Quartas: Transformação mediante encaminhamento. Quintas: desenvolvimento dos Filhos da Corrente em Grupo I e Grupo II conforme calendário anual.', 'agenda-viva', null, 10),
    (tucxa_id, doc_regulamento, 'comunicacao-oficial', 'Comunicação oficial', 'O grupo Recados TUCXA é canal oficial da Diretoria e Organização. Os dados de WhatsApp e e-mail devem estar atualizados para reduzir perda de orientações.', 'corrente-em-dia', null, 20),
    (tucxa_id, doc_procedimentos, 'preparo-material', 'Preparo material e silêncio', 'Alimentação leve, roupa branca adequada, banho de defesa, chegada em silêncio, defumação, saudação ao Congá e firmeza são pontos de preparo para o trabalho espiritual.', 'agenda-viva', 'filho-da-corrente', 10),
    (tucxa_id, doc_procedimentos, 'responsabilidade-mediunica', 'Responsabilidade mediúnica', 'O desenvolvimento mediúnico exige estudo, fé, autoconhecimento, responsabilidade, assiduidade e respeito às orientações da casa.', 'agenda-viva', 'cavalinho', 20),
    (tucxa_id, doc_cambonos, 'sigilo-anotacoes', 'Sigilo, anotações e apoio ao consulente', 'O Cambono auxilia a entidade, apoia a comunicação com consulentes, faz anotações necessárias, mantém sigilo e reporta dúvidas ou situações fora do procedimento à coordenação.', 'atendimento-em-harmonia', 'cambono', 10),
    (tucxa_id, doc_cambonos, 'retorno-obrigatorio', 'Retorno obrigatório e encaminhamentos', 'Quando a entidade solicitar retorno obrigatório ou encaminhamento para Transformação, o Cambono deve avisar um coordenador para garantir continuidade do atendimento.', 'atendimento-em-harmonia', 'cambono', 20)
  on conflict (document_id, slug) do update set
    title = excluded.title,
    body = excluded.body,
    related_module_slug = excluded.related_module_slug,
    related_role_slug = excluded.related_role_slug,
    sort_order = excluded.sort_order,
    updated_at = now();

  update public.oh_roles set
    responsibilities = case slug
      when 'filho-da-corrente' then '["Manter cadastro atualizado", "Cumprir regulamento e orientações da casa", "Participar dos trabalhos e estudos conforme vínculo", "Acompanhar comunicados oficiais"]'::jsonb
      when 'cambono' then '["Apoiar a entidade durante o atendimento", "Orientar consulentes com discrição", "Anotar missões, retornos, guias e encaminhamentos", "Avisar coordenação em exceções ou retorno obrigatório", "Manter sigilo"]'::jsonb
      when 'cavalinho' then '["Atuar mediunicamente com responsabilidade", "Manter preparo e assiduidade", "Associar-se às entidades com as quais trabalha", "Indicar entidade principal de atendimento quando aplicável"]'::jsonb
      else responsibilities
    end,
    guidance = case slug
      when 'filho-da-corrente' then 'Use esta função como base de acesso à área exclusiva do Filho da Corrente.'
      when 'cambono' then 'Na aprovação, confira se a pessoa cambona entidade específica e em quais dias participa.'
      when 'cavalinho' then 'Cadastre as entidades vinculadas e marque a entidade principal que atende consulentes quando houver.'
      else guidance
    end,
    updated_at = now()
  where organization_id = tucxa_id
    and slug in ('filho-da-corrente', 'cambono', 'cavalinho');

  insert into public.oh_contribution_settings (organization_id, contribution_type, title, description, suggested_amount, allow_custom_amount, allow_anonymous, recurrence, payment_methods, sort_order)
  values
    (tucxa_id, 'mensal-identificada', 'Contribuição mensal identificada', 'Contribuição recorrente do Filho da Corrente com status, histórico e lembrete.', null, true, false, 'mensal', array['pix', 'dinheiro', 'comprovante']::text[], 10),
    (tucxa_id, 'pontual-identificada', 'Contribuição pontual identificada', 'Contribuição para campanhas, reformas, eventos ou necessidades específicas com conferência pela tesouraria.', null, true, false, 'pontual', array['pix', 'dinheiro', 'comprovante']::text[], 20),
    (tucxa_id, 'anonima', 'Contribuição anônima', 'Opção para apoio sem exposição de identidade quando a organização habilitar.', null, true, true, 'pontual', array['pix']::text[], 30)
  on conflict (organization_id, module_slug, contribution_type) do update set
    title = excluded.title,
    description = excluded.description,
    suggested_amount = excluded.suggested_amount,
    allow_custom_amount = excluded.allow_custom_amount,
    allow_anonymous = excluded.allow_anonymous,
    recurrence = excluded.recurrence,
    payment_methods = excluded.payment_methods,
    sort_order = excluded.sort_order,
    updated_at = now();
end $$;
