-- Automação Extrema — Corrente em Dia
-- 03. Dados fictícios para ensaios, demonstrações e testes.
-- Não representam entidades reais. Não usar para contato.

-- Clientes AE fictícios.
insert into public.ae_clients (client_type, display_name, legal_name, slug, email, whatsapp, city, state, status, notes, is_demo) values
  ('federacao', 'Federação Luz da Jurema', 'Federação Luz da Jurema - Dados Fictícios', 'federacao-luz-da-jurema', 'contato@luzdajurema.exemplo.com', '(19) 90000-1001', 'Campinas', 'SP', 'ativo', 'Dado fictício para teste.', true),
  ('associacao', 'Associação Caminhos do Axé', 'Associação Caminhos do Axé - Dados Fictícios', 'associacao-caminhos-do-axe', 'financeiro@caminhosdoaxe.exemplo.com', '(11) 90000-2002', 'São Paulo', 'SP', 'ativo', 'Dado fictício para teste.', true),
  ('federacao', 'Federação Sementes de Aruanda', 'Federação Sementes de Aruanda - Dados Fictícios', 'federacao-sementes-de-aruanda', 'contato@sementesdearuanda.exemplo.com', '(21) 90000-3003', 'Rio de Janeiro', 'RJ', 'ativo', 'Dado fictício para teste.', true),
  ('terreiro', 'Casa Pai Benedito das Matas', 'Casa Pai Benedito das Matas - Dados Fictícios', 'casa-pai-benedito-das-matas', 'gestao@paibenedito.exemplo.com', '(19) 90000-4004', 'Campinas', 'SP', 'ativo', 'Terreiro fictício vinculado à federação.', true),
  ('terreiro', 'Tenda Cabocla Estrela Verde', 'Tenda Cabocla Estrela Verde - Dados Fictícios', 'tenda-cabocla-estrela-verde', 'contato@estrelaverde.exemplo.com', '(16) 90000-5005', 'Ribeirão Preto', 'SP', 'ativo', 'Terreiro fictício sem vínculo.', true),
  ('terreiro', 'Templo Vovó Catarina de Aruanda', 'Templo Vovó Catarina de Aruanda - Dados Fictícios', 'templo-vovo-catarina-de-aruanda', 'secretaria@vovocatarina.exemplo.com', '(15) 90000-6006', 'Sorocaba', 'SP', 'ativo', 'Terreiro fictício vinculado à associação.', true),
  ('terreiro', 'Centro Pai Joaquim de Angola', 'Centro Pai Joaquim de Angola - Dados Fictícios', 'centro-pai-joaquim-de-angola', 'financeiro@paijoaquim.exemplo.com', '(31) 90000-7007', 'Belo Horizonte', 'MG', 'ativo', 'Terreiro fictício para teste adicional.', true)
on conflict (slug) do update set
  client_type = excluded.client_type,
  display_name = excluded.display_name,
  legal_name = excluded.legal_name,
  email = excluded.email,
  whatsapp = excluded.whatsapp,
  city = excluded.city,
  state = excluded.state,
  status = excluded.status,
  notes = excluded.notes,
  is_demo = excluded.is_demo;

-- Assinaturas dos clientes na solução.
insert into public.ae_client_solution_subscriptions (client_id, solution_id, status, commercial_model, setup_fee, monthly_fee, operational_fee_percentage, notes)
select c.id, s.id, 'piloto', 'taxa_operacional', 0, 0, 2.50, 'Piloto Corrente em Dia com implantação e mensalidade R$ 0,00.'
from public.ae_clients c
cross join public.ae_solutions s
where s.slug = 'corrente-em-dia'
  and c.slug in ('federacao-luz-da-jurema','associacao-caminhos-do-axe','federacao-sementes-de-aruanda','casa-pai-benedito-das-matas','tenda-cabocla-estrela-verde','templo-vovo-catarina-de-aruanda','centro-pai-joaquim-de-angola')
on conflict (client_id, solution_id) do update set
  status = excluded.status,
  commercial_model = excluded.commercial_model,
  setup_fee = excluded.setup_fee,
  monthly_fee = excluded.monthly_fee,
  operational_fee_percentage = excluded.operational_fee_percentage,
  notes = excluded.notes;

-- Relações AE entre clientes.
insert into public.ae_client_relationships (parent_client_id, child_client_id, relationship_type, notes)
select p.id, ch.id, 'filiacao', 'Vínculo fictício para ensaio.'
from public.ae_clients p
join public.ae_clients ch on (
  (p.slug = 'federacao-luz-da-jurema' and ch.slug = 'casa-pai-benedito-das-matas') or
  (p.slug = 'associacao-caminhos-do-axe' and ch.slug = 'templo-vovo-catarina-de-aruanda') or
  (p.slug = 'federacao-sementes-de-aruanda' and ch.slug = 'centro-pai-joaquim-de-angola')
)
on conflict (parent_client_id, child_client_id, relationship_type) do update set notes = excluded.notes, is_active = true;

-- Organizações Corrente em Dia.
insert into public.ced_organizations (
  ae_client_id, organization_type, name, slug, legal_name, email, whatsapp, address_line, neighborhood, city, state,
  pix_key, pix_key_type, pix_receiver_name, default_individual_amount, default_family_amount, contribution_due_day, contribution_due_mode,
  public_headline, deep_dive_text, public_status, is_demo
)
select c.id, c.client_type, c.display_name, c.slug, c.legal_name, c.email, c.whatsapp,
  case c.slug
    when 'casa-pai-benedito-das-matas' then 'Rua das Palmeiras, 100'
    when 'tenda-cabocla-estrela-verde' then 'Avenida das Águas, 250'
    when 'templo-vovo-catarina-de-aruanda' then 'Rua da Paz, 77'
    else 'Endereço fictício, 123'
  end,
  'Centro', c.city, c.state,
  case c.slug
    when 'federacao-luz-da-jurema' then 'pix@luzdajurema.exemplo.com'
    when 'associacao-caminhos-do-axe' then 'financeiro@caminhosdoaxe.exemplo.com'
    when 'casa-pai-benedito-das-matas' then 'pix@paibenedito.exemplo.com'
    when 'tenda-cabocla-estrela-verde' then 'pix@estrelaverde.exemplo.com'
    when 'templo-vovo-catarina-de-aruanda' then 'pix@vovocatarina.exemplo.com'
    else 'pix@demo-corrente-em-dia.exemplo.com'
  end,
  'email', c.display_name,
  case when c.client_type = 'terreiro' then 50.00 else null end,
  case when c.client_type = 'terreiro' then 120.00 else null end,
  case when c.client_type = 'terreiro' then 10 else null end,
  case when c.client_type = 'terreiro' then 'until_day' else 'free_month' end,
  'Contribuições organizadas para manter a corrente firme.',
  'Sua contribuição ajuda a manter a casa preparada, organizada e acolhedora. Quando cada um cuida de uma parte, a corrente segue firme sem constrangimento e com mais clareza para todos.',
  'ativo', true
from public.ae_clients c
where c.slug in ('federacao-luz-da-jurema','associacao-caminhos-do-axe','federacao-sementes-de-aruanda','casa-pai-benedito-das-matas','tenda-cabocla-estrela-verde','templo-vovo-catarina-de-aruanda','centro-pai-joaquim-de-angola')
on conflict (slug) do update set
  ae_client_id = excluded.ae_client_id,
  organization_type = excluded.organization_type,
  name = excluded.name,
  legal_name = excluded.legal_name,
  email = excluded.email,
  whatsapp = excluded.whatsapp,
  address_line = excluded.address_line,
  neighborhood = excluded.neighborhood,
  city = excluded.city,
  state = excluded.state,
  pix_key = excluded.pix_key,
  pix_key_type = excluded.pix_key_type,
  pix_receiver_name = excluded.pix_receiver_name,
  default_individual_amount = excluded.default_individual_amount,
  default_family_amount = excluded.default_family_amount,
  contribution_due_day = excluded.contribution_due_day,
  contribution_due_mode = excluded.contribution_due_mode,
  public_headline = excluded.public_headline,
  deep_dive_text = excluded.deep_dive_text,
  public_status = excluded.public_status,
  is_demo = excluded.is_demo;

-- Vínculos Corrente em Dia.
insert into public.ced_organization_links (parent_organization_id, child_organization_id, relationship_type, notes)
select p.id, ch.id, 'filiacao', 'Vínculo fictício para ensaio.'
from public.ced_organizations p
join public.ced_organizations ch on (
  (p.slug = 'federacao-luz-da-jurema' and ch.slug = 'casa-pai-benedito-das-matas') or
  (p.slug = 'associacao-caminhos-do-axe' and ch.slug = 'templo-vovo-catarina-de-aruanda') or
  (p.slug = 'federacao-sementes-de-aruanda' and ch.slug = 'centro-pai-joaquim-de-angola')
)
on conflict (parent_organization_id, child_organization_id, relationship_type) do update set is_active = true, notes = excluded.notes;

-- Funções padrão.
insert into public.ced_roles (slug, name, applies_to, description, is_manager, is_financial_role, sort_order) values
  ('presidente', 'Presidente', 'todos', 'Responsável institucional pela entidade.', true, false, 10),
  ('tesoureiro', 'Tesoureiro(a)', 'todos', 'Responsável financeiro pela conferência e relatórios.', true, true, 11),
  ('dirigente', 'Dirigente / Pai ou Mãe de Santo', 'terreiro', 'Responsável espiritual e/ou administrativo da casa.', true, false, 12),
  ('coordenador', 'Coordenador(a)', 'todos', 'Responsável por grupos, corrente ou operação.', true, false, 13),
  ('cambono', 'Cambono(a)', 'terreiro', 'Participante da corrente com contribuição individual.', false, false, 20),
  ('cavalo-medium', 'Cavalo / Médium', 'terreiro', 'Participante da corrente com contribuição individual.', false, false, 21),
  ('consulente-contribuinte', 'Consulente contribuinte', 'terreiro', 'Pessoa atendida que contribui eventualmente.', false, false, 30),
  ('familia-contribuinte', 'Família contribuinte', 'terreiro', 'Grupo familiar com contribuição única.', false, false, 31)
on conflict (slug) do update set
  name = excluded.name,
  applies_to = excluded.applies_to,
  description = excluded.description,
  is_manager = excluded.is_manager,
  is_financial_role = excluded.is_financial_role,
  sort_order = excluded.sort_order;

-- Pessoas fictícias.
insert into public.ced_people (full_name, email, whatsapp, person_type, status, notes, is_demo) values
  ('Laércio Bizzarri - teste parceiro', 'laercio.teste@correnteemdia.exemplo.com', '(19) 90000-0001', 'parceiro', 'ativo', 'Usuário fictício para Laércio simular parceiro/comercial.', true),
  ('Márcio AE - teste gestor', 'marcio.teste@correnteemdia.exemplo.com', '(19) 90000-0002', 'gestor', 'ativo', 'Usuário fictício para AE simular gestão.', true),
  ('Maria Aparecida Santos', 'maria.santos@exemplo.com', '(19) 98888-1001', 'contribuinte', 'ativo', 'Cambona fictícia.', true),
  ('João Carlos Almeida', 'joao.almeida@exemplo.com', '(19) 98888-1002', 'contribuinte', 'ativo', 'Cavalo/médium fictício.', true),
  ('Ana Paula Lima', 'ana.lima@exemplo.com', '(15) 98888-1003', 'consulente', 'ativo', 'Consulente contribuinte fictícia.', true),
  ('Carlos Eduardo Oliveira', 'carlos.oliveira@exemplo.com', '(16) 98888-1004', 'familiar', 'ativo', 'Responsável pela Família Oliveira.', true),
  ('Fernanda Oliveira', 'fernanda.oliveira@exemplo.com', '(16) 98888-1005', 'familiar', 'ativo', 'Membro da Família Oliveira.', true),
  ('Rita de Cássia Menezes', 'rita.menezes@exemplo.com', '(31) 98888-1006', 'gestor', 'ativo', 'Tesoureira fictícia.', true),
  ('Paulo Roberto Nogueira', 'paulo.nogueira@exemplo.com', '(11) 98888-1007', 'gestor', 'ativo', 'Presidente fictício.', true)
on conflict do nothing;

-- Vínculos de pessoas às organizações.
insert into public.ced_person_organizations (person_id, organization_id, role_id, is_manager, is_financial_responsible, contribution_enabled)
select p.id, o.id, r.id,
  r.slug in ('presidente', 'tesoureiro', 'dirigente'),
  r.slug = 'tesoureiro',
  p.person_type in ('contribuinte', 'consulente', 'familiar')
from public.ced_people p
join public.ced_organizations o on (
  (p.email = 'maria.santos@exemplo.com' and o.slug = 'casa-pai-benedito-das-matas') or
  (p.email = 'joao.almeida@exemplo.com' and o.slug = 'casa-pai-benedito-das-matas') or
  (p.email = 'ana.lima@exemplo.com' and o.slug = 'templo-vovo-catarina-de-aruanda') or
  (p.email = 'carlos.oliveira@exemplo.com' and o.slug = 'tenda-cabocla-estrela-verde') or
  (p.email = 'fernanda.oliveira@exemplo.com' and o.slug = 'tenda-cabocla-estrela-verde') or
  (p.email = 'rita.menezes@exemplo.com' and o.slug = 'centro-pai-joaquim-de-angola') or
  (p.email = 'paulo.nogueira@exemplo.com' and o.slug = 'associacao-caminhos-do-axe')
)
join public.ced_roles r on (
  (p.email = 'maria.santos@exemplo.com' and r.slug = 'cambono') or
  (p.email = 'joao.almeida@exemplo.com' and r.slug = 'cavalo-medium') or
  (p.email = 'ana.lima@exemplo.com' and r.slug = 'consulente-contribuinte') or
  (p.email in ('carlos.oliveira@exemplo.com','fernanda.oliveira@exemplo.com') and r.slug = 'familia-contribuinte') or
  (p.email = 'rita.menezes@exemplo.com' and r.slug = 'tesoureiro') or
  (p.email = 'paulo.nogueira@exemplo.com' and r.slug = 'presidente')
)
on conflict (person_id, organization_id, role_id) do update set
  is_manager = excluded.is_manager,
  is_financial_responsible = excluded.is_financial_responsible,
  contribution_enabled = excluded.contribution_enabled;

-- Famílias fictícias.
insert into public.ced_families (organization_id, name, responsible_person_id, default_amount, due_day, status, is_demo)
select o.id, 'Família Oliveira', p.id, 120.00, 15, 'ativo', true
from public.ced_organizations o
join public.ced_people p on p.email = 'carlos.oliveira@exemplo.com'
where o.slug = 'tenda-cabocla-estrela-verde'
on conflict do nothing;

insert into public.ced_family_members (family_id, person_id, relationship_label)
select f.id, p.id, case when p.email = 'carlos.oliveira@exemplo.com' then 'Responsável' else 'Membro' end
from public.ced_families f
join public.ced_people p on p.email in ('carlos.oliveira@exemplo.com','fernanda.oliveira@exemplo.com')
where f.name = 'Família Oliveira'
on conflict (family_id, person_id) do update set relationship_label = excluded.relationship_label;

-- Regras de contribuição.
insert into public.ced_contribution_rules (organization_id, person_id, rule_type, amount, due_day, due_mode, notes)
select o.id, p.id, 'individual', 50.00, 10, 'until_day', 'Contribuição mensal individual fictícia.'
from public.ced_organizations o
join public.ced_people p on p.email in ('maria.santos@exemplo.com','joao.almeida@exemplo.com')
where o.slug = 'casa-pai-benedito-das-matas'
on conflict do nothing;

insert into public.ced_contribution_rules (organization_id, person_id, rule_type, amount, due_day, due_mode, notes)
select o.id, p.id, 'eventual', null, null, 'free_month', 'Contribuição eventual de consulente fictícia.'
from public.ced_organizations o
join public.ced_people p on p.email = 'ana.lima@exemplo.com'
where o.slug = 'templo-vovo-catarina-de-aruanda'
on conflict do nothing;

insert into public.ced_contribution_rules (organization_id, family_id, rule_type, amount, due_day, due_mode, notes)
select o.id, f.id, 'familia', 120.00, 15, 'until_day', 'Contribuição familiar fictícia.'
from public.ced_organizations o
join public.ced_families f on f.organization_id = o.id and f.name = 'Família Oliveira'
where o.slug = 'tenda-cabocla-estrela-verde'
on conflict do nothing;

-- Contribuições do mês atual.
insert into public.ced_contributions (
  organization_id, contribution_rule_id, person_id, family_id, reference_month, expected_amount, due_date,
  pix_key_expected, pix_receiver_expected, pix_payload, status, generated_by, notes
)
select
  r.organization_id,
  r.id,
  r.person_id,
  r.family_id,
  date_trunc('month', current_date)::date,
  coalesce(r.amount, 30.00),
  case when r.due_day is not null then (date_trunc('month', current_date)::date + (r.due_day - 1))::date else null end,
  o.pix_key,
  o.pix_receiver_name,
  'PIX-DEMO|' || o.pix_key || '|VALOR=' || coalesce(r.amount, 30.00)::text,
  case
    when r.person_id = (select id from public.ced_people where email = 'maria.santos@exemplo.com' limit 1) then 'aprovado'
    when r.person_id = (select id from public.ced_people where email = 'joao.almeida@exemplo.com' limit 1) then 'comprovante_enviado'
    else 'em_aberto'
  end,
  'seed',
  'Contribuição fictícia gerada para teste.'
from public.ced_contribution_rules r
join public.ced_organizations o on o.id = r.organization_id
on conflict do nothing;

-- Comprovante fictício em revisão para João.
insert into public.ced_payment_receipts (
  contribution_id, uploaded_by_person_id, file_url, file_name, informed_amount, informed_paid_at,
  ocr_amount, ocr_pix_key, ocr_receiver_name, ocr_status_text, transaction_e2e_id,
  validation_status, validation_notes, raw_text
)
select c.id, c.person_id, '/demo/comprovante-joao.png', 'comprovante-joao.png', 50.00, now(),
  50.00, c.pix_key_expected, c.pix_receiver_expected, 'Pagamento realizado', 'E2E-DEMO-JOAO-' || to_char(current_date, 'YYYYMM'),
  'pre_validado', 'Valor, chave Pix e status coerentes para teste de aprovação.',
  'Comprovante fictício: pagamento realizado via Pix no valor de R$ 50,00.'
from public.ced_contributions c
join public.ced_people p on p.id = c.person_id
where p.email = 'joao.almeida@exemplo.com'
on conflict do nothing;

-- Regras de repasse/split gerencial para piloto.
insert into public.ced_split_rules (organization_id, solution_id, beneficiary_kind, beneficiary_name, percentage, applies_when, notes)
select o.id, s.id, 'ae', 'Automação Extrema / Márcio', 1.00, 'sempre', 'Percentual piloto manual enxuto; revisar ao escalar.'
from public.ced_organizations o cross join public.ae_solutions s
where s.slug = 'corrente-em-dia' and o.organization_type = 'terreiro'
on conflict do nothing;

insert into public.ced_split_rules (organization_id, solution_id, beneficiary_kind, beneficiary_name, percentage, applies_when, notes)
select o.id, s.id, 'laercio', 'Laércio Bizzarri', 1.00, 'sempre', 'Percentual piloto manual enxuto; revisar ao escalar.'
from public.ced_organizations o cross join public.ae_solutions s
where s.slug = 'corrente-em-dia' and o.organization_type = 'terreiro'
on conflict do nothing;

insert into public.ced_split_rules (organization_id, solution_id, beneficiary_kind, beneficiary_name, percentage, applies_when, notes)
select ch.id, s.id,
  case when p.organization_type = 'federacao' then 'federacao' else 'associacao' end,
  p.name,
  0.50,
  'quando_vinculado',
  'Repasse gerencial piloto quando houver vínculo/indicação. Deve estar claro em contrato.'
from public.ced_organization_links l
join public.ced_organizations p on p.id = l.parent_organization_id
join public.ced_organizations ch on ch.id = l.child_organization_id
cross join public.ae_solutions s
where s.slug = 'corrente-em-dia'
on conflict do nothing;

insert into public.ced_split_rules (organization_id, solution_id, beneficiary_kind, beneficiary_name, percentage, applies_when, notes)
select o.id, s.id, 'reserva_operacional', 'Reserva operacional / aquisição', 0.50, 'terreiro_sem_vinculo', 'Usar em casas não filiadas. Definir regra final em contrato.'
from public.ced_organizations o cross join public.ae_solutions s
where s.slug = 'corrente-em-dia'
  and o.organization_type = 'terreiro'
  and not exists (select 1 from public.ced_organization_links l where l.child_organization_id = o.id)
on conflict do nothing;

-- Templates de lembrete.
insert into public.ced_reminder_templates (organization_id, template_key, channel, title, body)
select o.id, v.template_key, 'whatsapp', v.title, v.body
from public.ced_organizations o
cross join (values
  ('antes_prazo', 'Lembrete antes do prazo', 'Olá, {{nome}}. Sua contribuição ajuda a manter a casa preparada para acolher quem precisa. Quando cada um cuida de uma parte, a corrente segue firme.'),
  ('no_prazo', 'Lembrete no prazo', 'Olá, {{nome}}. Hoje é o dia combinado para sua contribuição mensal. Com ela, a casa segue organizada, iluminada e em condições de manter seus trabalhos.'),
  ('apos_atraso', 'Lembrete após atraso', 'Olá, {{nome}}. Percebemos que sua contribuição deste mês ainda está pendente. Caso possa regularizar, sua ajuda faz diferença na manutenção da casa e no cuidado com todos.'),
  ('agradecimento', 'Agradecimento', 'Olá, {{nome}}. Recebemos sua contribuição. Gratidão por ajudar a manter essa corrente firme, organizada e acolhedora.')
) as v(template_key, title, body)
where o.organization_type = 'terreiro'
on conflict (organization_id, template_key, channel) do update set title = excluded.title, body = excluded.body, is_active = true;

-- Sites/páginas de clientes fictícios.
insert into public.ae_client_sites (solution_id, client_id, client_name, site_name, slug, url, public_path, page_type, status, notes, solution_slug, is_demo)
select s.id, c.id, c.display_name, c.display_name || ' — Corrente em Dia', c.slug,
  null, '/c/' || c.slug, 'corrente_em_dia', 'piloto', 'Página fictícia para teste Corrente em Dia.', 'corrente-em-dia', true
from public.ae_clients c
cross join public.ae_solutions s
where s.slug = 'corrente-em-dia'
  and c.client_type in ('federacao', 'associacao', 'terreiro')
on conflict (slug) do update set
  solution_id = excluded.solution_id,
  client_id = excluded.client_id,
  client_name = excluded.client_name,
  site_name = excluded.site_name,
  public_path = excluded.public_path,
  page_type = excluded.page_type,
  status = excluded.status,
  notes = excluded.notes,
  solution_slug = excluded.solution_slug,
  is_demo = excluded.is_demo;
