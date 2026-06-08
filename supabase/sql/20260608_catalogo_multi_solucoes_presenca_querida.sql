-- Automação Extrema — catálogo multi-solução, parceiros e sites de clientes
-- Rode este arquivo no Supabase SQL Editor depois dos scripts anteriores.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create unique index if not exists idx_ae_solutions_slug_unique on public.ae_solutions(slug);

create table if not exists public.ae_target_audiences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  deep_dive_value text,
  is_active boolean not null default true,
  sort_order integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ae_pains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  emotional_impact text,
  is_active boolean not null default true,
  sort_order integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ae_features (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null default 'Geral',
  description text,
  value_reason text,
  deep_dive_benefit text,
  is_active boolean not null default true,
  sort_order integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ae_solution_target_audiences (
  solution_id uuid not null references public.ae_solutions(id) on delete cascade,
  target_audience_id uuid not null references public.ae_target_audiences(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (solution_id, target_audience_id)
);
create table if not exists public.ae_solution_pains (
  solution_id uuid not null references public.ae_solutions(id) on delete cascade,
  pain_id uuid not null references public.ae_pains(id) on delete cascade,
  intensity text not null default 'media',
  created_at timestamptz not null default now(),
  primary key (solution_id, pain_id)
);
create table if not exists public.ae_solution_features (
  solution_id uuid not null references public.ae_solutions(id) on delete cascade,
  feature_id uuid not null references public.ae_features(id) on delete cascade,
  is_core boolean not null default false,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (solution_id, feature_id)
);
create table if not exists public.ae_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  partner_type text not null default 'parceiro',
  contact_name text,
  email text,
  whatsapp text,
  commission_percentage numeric(5,2) not null default 0 check (commission_percentage >= 0 and commission_percentage <= 100),
  status text not null default 'ativo',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ae_solution_partners (
  solution_id uuid not null references public.ae_solutions(id) on delete cascade,
  partner_id uuid not null references public.ae_partners(id) on delete cascade,
  default_commission_percentage numeric(5,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (solution_id, partner_id)
);
create table if not exists public.ae_client_sites (
  id uuid primary key default gen_random_uuid(),
  solution_id uuid not null references public.ae_solutions(id) on delete cascade,
  client_name text not null,
  site_name text not null,
  slug text not null unique,
  url text,
  public_path text,
  page_type text not null default 'site_cliente',
  status text not null default 'planejado',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_ae_target_audiences_updated_at on public.ae_target_audiences;
create trigger trg_ae_target_audiences_updated_at before update on public.ae_target_audiences for each row execute function public.set_updated_at();
drop trigger if exists trg_ae_pains_updated_at on public.ae_pains;
create trigger trg_ae_pains_updated_at before update on public.ae_pains for each row execute function public.set_updated_at();
drop trigger if exists trg_ae_features_updated_at on public.ae_features;
create trigger trg_ae_features_updated_at before update on public.ae_features for each row execute function public.set_updated_at();
drop trigger if exists trg_ae_partners_updated_at on public.ae_partners;
create trigger trg_ae_partners_updated_at before update on public.ae_partners for each row execute function public.set_updated_at();
drop trigger if exists trg_ae_client_sites_updated_at on public.ae_client_sites;
create trigger trg_ae_client_sites_updated_at before update on public.ae_client_sites for each row execute function public.set_updated_at();

create index if not exists idx_ae_solution_target_audiences_target_audience_id on public.ae_solution_target_audiences(target_audience_id);
create index if not exists idx_ae_solution_pains_pain_id on public.ae_solution_pains(pain_id);
create index if not exists idx_ae_solution_features_feature_id on public.ae_solution_features(feature_id);
create index if not exists idx_ae_solution_partners_partner_id on public.ae_solution_partners(partner_id);
create index if not exists idx_ae_client_sites_solution_id on public.ae_client_sites(solution_id);

alter table public.ae_target_audiences enable row level security;
drop policy if exists "Authenticated can read ae_target_audiences" on public.ae_target_audiences;
create policy "Authenticated can read ae_target_audiences" on public.ae_target_audiences for select to authenticated using (true);
alter table public.ae_pains enable row level security;
drop policy if exists "Authenticated can read ae_pains" on public.ae_pains;
create policy "Authenticated can read ae_pains" on public.ae_pains for select to authenticated using (true);
alter table public.ae_features enable row level security;
drop policy if exists "Authenticated can read ae_features" on public.ae_features;
create policy "Authenticated can read ae_features" on public.ae_features for select to authenticated using (true);
alter table public.ae_solution_target_audiences enable row level security;
drop policy if exists "Authenticated can read ae_solution_target_audiences" on public.ae_solution_target_audiences;
create policy "Authenticated can read ae_solution_target_audiences" on public.ae_solution_target_audiences for select to authenticated using (true);
alter table public.ae_solution_pains enable row level security;
drop policy if exists "Authenticated can read ae_solution_pains" on public.ae_solution_pains;
create policy "Authenticated can read ae_solution_pains" on public.ae_solution_pains for select to authenticated using (true);
alter table public.ae_solution_features enable row level security;
drop policy if exists "Authenticated can read ae_solution_features" on public.ae_solution_features;
create policy "Authenticated can read ae_solution_features" on public.ae_solution_features for select to authenticated using (true);
alter table public.ae_partners enable row level security;
drop policy if exists "Authenticated can read ae_partners" on public.ae_partners;
create policy "Authenticated can read ae_partners" on public.ae_partners for select to authenticated using (true);
alter table public.ae_solution_partners enable row level security;
drop policy if exists "Authenticated can read ae_solution_partners" on public.ae_solution_partners;
create policy "Authenticated can read ae_solution_partners" on public.ae_solution_partners for select to authenticated using (true);
alter table public.ae_client_sites enable row level security;
drop policy if exists "Authenticated can read ae_client_sites" on public.ae_client_sites;
create policy "Authenticated can read ae_client_sites" on public.ae_client_sites for select to authenticated using (true);

-- Carga base vinda da planilha AE - Soluções / AE_Solucoes_atualizada.xlsx
insert into public.ae_solutions (name, slug, short_description, target_audience, main_pains, current_status, stage, priority, source_file, is_active) values
  ($q$Festa no Controle$q$, $q$festa-no-controle$q$, $q$Gestão operacional mobile-first para festas comunitárias e beneficentes: pedidos, cardápio, caixa, combos, bingo, voluntários e prestação de contas.$q$, $q$Escolas, igrejas, associações, festas juninas, eventos beneficentes e equipes voluntárias.$q$, $q$Filas, papel, fichas, Pix manual, pedidos confusos, retrabalho no caixa, baixa visão da operação e prestação de contas trabalhosa.$q$, 'validando', 'validacao', 24, 'AE - Soluções.xlsx', true),
  ($q$Jornada Personal Extrema$q$, $q$jornada-personal-extrema$q$, $q$CRM e jornada de acompanhamento para profissionais de serviço que vendem cuidado contínuo, evolução e relacionamento, não apenas atendimento avulso.$q$, $q$Personal trainers, terapeutas, consultores, coaches, professores particulares e profissionais com clientes recorrentes.$q$, $q$WhatsApp desorganizado, memória do cliente espalhada, follow-up fraco, perda de timing comercial, baixa retenção e dificuldade de mostrar evolução.$q$, 'validando', 'validacao', 23, 'AE - Soluções.xlsx', true),
  ($q$Presença Querida$q$, $q$presenca-querida$q$, $q$Gestão afetiva de presença para eventos sociais: convite, RSVP, grupos, lembretes, mensagens, recados, orientações finais e pós-evento.$q$, $q$Famílias, aniversários, casamentos, bodas, confraternizações, cerimonialistas, buffets e organizadores sociais.$q$, $q$Confirmações espalhadas, ansiedade do organizador, pendentes sem retorno, acompanhantes incertos, mensagens manuais e falta de previsibilidade para buffet e lembranças.$q$, 'validando', 'validacao', 22, 'AE - Soluções.xlsx', true),
  ($q$Discoteca Digital$q$, $q$discoteca-digital$q$, $q$Catálogo inteligente para transformar coleções musicais em acervo organizado, pesquisável, valorizado e compartilhável com controle.$q$, $q$Colecionadores de vinil, CDs e mídias físicas, DJs, sebos, lojas de usados, curadores e famílias com acervos musicais.$q$, $q$Acervo em planilhas/fotos/memória, compra duplicada, dificuldade de localizar itens, falta de capa/valor/estado e pouca proteção para venda, seguro ou herança.$q$, 'validando', 'validacao', 21, 'AE - Soluções.xlsx', true),
  ($q$Família Presente 60+$q$, $q$familia-presente-60$q$, $q$Camada de cuidado assistido para idosos: rotina, consultas, lembretes, apoio digital, prevenção de golpes, portal familiar e tranquilidade.$q$, $q$Famílias com idosos independentes, filhos responsáveis, cuidadores, acompanhantes e prestadores de apoio 60+.$q$, $q$Dificuldade digital, familiares sobrecarregados, consultas esquecidas, medo de golpes, mensagens dispersas, dependência de favores e falta de visibilidade da rotina.$q$, 'validando', 'validacao', 20, 'AE - Soluções.xlsx', true),
  ($q$Escuta Viva$q$, $q$escuta-viva$q$, $q$Método de escuta e decisão para transformar pesquisas simples em diagnóstico, ranking de dores, prioridades e plano de ação.$q$, $q$Associações, escolas, grupos religiosos, comunidades, ONGs, pequenos negócios, projetos sociais e lideranças de equipes.$q$, $q$Opiniões dispersas, decisões por achismo, baixa participação, medo de se expor, dificuldade de priorizar melhorias e ausência de devolutiva prática.$q$, 'validando', 'validacao', 19, 'AE - Soluções.xlsx', true),
  ($q$Caixa Claro$q$, $q$caixa-claro$q$, $q$Jornada de clareza financeira para enxergar caixa futuro, agenda financeira, riscos, decisões da semana e ações recomendadas.$q$, $q$Pessoas físicas organizadas, famílias/casais, autônomos, MEIs, prestadores de serviço e consultores financeiros.$q$, $q$Planilhas cansativas, falta de previsibilidade, cartão que mascara o caixa, contas futuras sem visão, mistura PF/PJ e decisões de gasto sem segurança.$q$, 'validando', 'validacao', 18, 'AE - Soluções.xlsx', true),
  ($q$Encanto no Controle - Site Cliente$q$, $q$encanto-no-controle-site-cliente$q$, $q$Site cliente do Encanto no Controle para apresentar papelaria criativa com catálogo guiado, temas, kits, curadoria visual e compra orientada.$q$, $q$Papelarias criativas, artesãos, negócios de lembrancinhas, produtos personalizados e clientes de festas escolares/familiares.$q$, $q$Catálogo confuso, dificuldade de escolher combinações, orçamento manual, dúvidas sobre temas/prazos, baixa percepção de valor e venda muito dependente do WhatsApp.$q$, 'validando', 'validacao', 17, 'AE - Soluções.xlsx', true),
  ($q$DNA de Valor$q$, $q$dna-de-valor$q$, $q$Transforma currículo, histórico e repertório em posicionamento comercial, narrativa de valor, oferta clara e plano prático de divulgação.$q$, $q$Profissionais autônomos, especialistas, consultores, prestadores de serviço, pequenos negócios e empresas de nicho.$q$, $q$Comunicação genérica, disputa por preço, currículo sem narrativa, dificuldade de provar valor, falta de oferta clara e pouca diferenciação frente ao mercado.$q$, 'validando', 'validacao', 16, 'AE - Soluções.xlsx', true),
  ($q$Modulo do Festa no Controle$q$, $q$modulo-do-festa-no-controle$q$, $q$Módulo do Festa no Controle para bingo e sorteios beneficentes com cartelas/números, participantes, pagamentos, conferência e transparência.$q$, $q$Eventos beneficentes, festas juninas, escolas, igrejas, associações, campanhas do Sementinha/Tucxa e equipes voluntárias.$q$, $q$Cartelas dispersas, controle manual, Pix e comprovantes no WhatsApp, risco de duplicidade, apuração confusa e pouca transparência para participantes.$q$, 'validando', 'validacao', 15, 'AE - Soluções.xlsx', true),
  ($q$Festa no Controle - Site Cliente$q$, $q$festa-no-controle-site-cliente$q$, $q$Site cliente do Festa no Controle para a Festa Junina Tucxa: pedidos, cardápio, combos, responsáveis, caixa, voluntários e relatórios.$q$, $q$Centro Tucxa, coordenação da festa, voluntários, garçons, caixa, compradores, famílias e convidados.$q$, $q$Fila no caixa, fichas em papel, pedidos por responsável sem consolidação, conferência manual, internet/processo no dia e fechamento financeiro trabalhoso.$q$, 'validando', 'validacao', 14, 'AE - Soluções.xlsx', true),
  ($q$Impacto no Controle$q$, $q$impacto-no-controle$q$, $q$Gestão completa de ações sociais, rifas e campanhas: página mobile, cotas/números, reserva, Pix, comprovante, aprovação e prestação de contas.$q$, $q$ONGs, protetores de animais, igrejas, escolas, grupos voluntários, campanhas solidárias e coordenadores de arrecadação.$q$, $q$Números controlados manualmente, links perdidos após Pix, comprovantes soltos, baixa confiança, retrabalho para aprovar pagamentos e pouca transparência final.$q$, 'validando', 'validacao', 13, 'AE - Soluções.xlsx', true),
  ($q$Sementinha no Controle$q$, $q$sementinha-no-controle$q$, $q$Gestão solidária de alimentos: doações, estoque, validade, cestas, entregas, voluntários, necessidades e prestação de contas simples.$q$, $q$Grupos voluntários, centros religiosos, ONGs, igrejas, associações e instituições que arrecadam e distribuem alimentos.$q$, $q$Informação espalhada, responsabilidade concentrada, alimentos vencendo, decisões de última hora, falta de lista real de necessidades e prestação de contas difícil.$q$, 'validando', 'validacao', 12, 'AE - Soluções.xlsx', true),
  ($q$Escuta Viva - Site Cliente$q$, $q$escuta-viva-site-cliente$q$, $q$Site cliente do Escuta Viva para diagnosticar a operação do Sementinha Alimentos e transformar respostas em prioridades acionáveis.$q$, $q$Coordenação, voluntários, diretoria, doadores e apoiadores envolvidos com arrecadação, estoque e distribuição de alimentos.$q$, $q$Percepções soltas, prioridades divergentes, baixa escuta dos voluntários, decisões sem dados e dificuldade de transformar problemas em plano 30/60/90 dias.$q$, 'validando', 'validacao', 11, 'AE - Soluções.xlsx', true),
  ($q$Bazar no Controle - Site Cliente$q$, $q$bazar-no-controle-site-cliente$q$, $q$Site cliente do Bazar no Controle para vender itens doados com catálogo, reserva, Pix, comprovante, separação, retirada e prestação de contas.$q$, $q$Sementinha, bazares beneficentes, voluntários, compradores locais, doadores e coordenações de campanhas sociais.$q$, $q$Itens únicos difíceis de localizar, cadastro irregular, fotos/etiquetas sem padrão, reserva manual, comprovantes dispersos e separação/retirada confusas.$q$, 'validando', 'validacao', 10, 'AE - Soluções.xlsx', true),
  ($q$Impacto no Controle - Site Cliente$q$, $q$impacto-no-controle-site-cliente$q$, $q$Site cliente do Impacto no Controle para a campanha São Francisco em Ação: números, Pix, comprovante, confirmação e transparência da arrecadação.$q$, $q$ONG Amigos de Pet, Tucxa/Sementinha, protetores, doadores, participantes da ação e coordenação da campanha.$q$, $q$Seleção de números perdida ao abrir o banco, controle manual de participantes, comprovantes duplicados, insegurança de pagamento e prestação de contas trabalhosa.$q$, 'validando', 'validacao', 9, 'AE - Soluções.xlsx', true),
  ($q$Escuta Viva - Pesquisa Tucxa$q$, $q$escuta-viva-pesquisa-tucxa$q$, $q$Site cliente do Escuta Viva para ouvir o Tucxa por perfis, mapear dores, priorizar melhorias e gerar relatório para decisão.$q$, $q$Dirigentes, coordenadores, cambonos, consulentes, voluntários e grupos de trabalho do Centro Tucxa.$q$, $q$Dores espalhadas, decisões sem base, receio de exposição, baixa participação, falta de ranking de prioridades e dificuldade de alinhar melhorias por público.$q$, 'validando', 'validacao', 8, 'AE - Soluções.xlsx', true),
  ($q$Encanto no Controle$q$, $q$encanto-no-controle$q$, $q$Plataforma de venda guiada para papelaria criativa: catálogo, curadoria visual, temas, kits, combinações, orçamento e jornada de compra.$q$, $q$Papelarias criativas, artesãos, negócios de personalizados, lembrancinhas, festas escolares e pequenos e-commerces por encomenda.$q$, $q$Cliente indecisa, combinações confusas, orçamento manual, dependência do WhatsApp, catálogo sem curadoria e baixa percepção de valor artesanal.$q$, 'validando', 'validacao', 7, 'AE - Soluções.xlsx', true),
  ($q$Bazar no Controle$q$, $q$bazar-no-controle$q$, $q$Gestão e venda assistida para bazares sociais: triagem, fotos, etiquetas, QR Code, localização física, reserva, Pix, retirada e prestação de contas.$q$, $q$Bazares beneficentes, brechós sociais, ONGs, igrejas, escolas, associações e campanhas de arrecadação com itens doados.$q$, $q$Itens únicos sem controle, dificuldade de encontrar produto vendido, fotos e cadastro sem padrão, estoque físico confuso, pagamento manual e baixa transparência.$q$, 'validando', 'validacao', 6, 'AE - Soluções.xlsx', true)
on conflict (slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  target_audience = excluded.target_audience,
  main_pains = excluded.main_pains,
  source_file = excluded.source_file,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.ae_target_audiences (slug, name, description, deep_dive_value, sort_order, is_active) values
  ($q$acompanhantes$q$, $q$acompanhantes$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 1, true),
  ($q$aniversarios$q$, $q$aniversários$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 2, true),
  ($q$apoiadores-envolvidos-com-arrecadacao$q$, $q$apoiadores envolvidos com arrecadação$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 3, true),
  ($q$artesaos$q$, $q$artesãos$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 4, true),
  ($q$associacoes$q$, $q$associações$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 5, true),
  ($q$autonomos$q$, $q$autônomos$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 6, true),
  ($q$bazares-beneficentes$q$, $q$bazares beneficentes$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 7, true),
  ($q$bodas$q$, $q$bodas$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 8, true),
  ($q$brechos-sociais$q$, $q$brechós sociais$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 9, true),
  ($q$buffets$q$, $q$buffets$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 10, true),
  ($q$caixa$q$, $q$caixa$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 11, true),
  ($q$cambonos$q$, $q$cambonos$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 12, true),
  ($q$campanhas-de-arrecadacao-com-itens-doados$q$, $q$campanhas de arrecadação com itens doados$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 13, true),
  ($q$campanhas-do-sementinha-tucxa$q$, $q$campanhas do Sementinha/Tucxa$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 14, true),
  ($q$campanhas-solidarias$q$, $q$campanhas solidárias$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 15, true),
  ($q$casamentos$q$, $q$casamentos$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 16, true),
  ($q$cds$q$, $q$CDs$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 17, true),
  ($q$centro-tucxa$q$, $q$Centro Tucxa$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 18, true),
  ($q$centros-religiosos$q$, $q$centros religiosos$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 19, true),
  ($q$cerimonialistas$q$, $q$cerimonialistas$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 20, true),
  ($q$clientes-de-festas-escolares-familiares$q$, $q$clientes de festas escolares/familiares$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 21, true),
  ($q$coaches$q$, $q$coaches$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 22, true),
  ($q$colecionadores-de-vinil$q$, $q$Colecionadores de vinil$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 23, true),
  ($q$compradores$q$, $q$compradores$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 24, true),
  ($q$compradores-locais$q$, $q$compradores locais$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 25, true),
  ($q$comunidades$q$, $q$comunidades$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 26, true),
  ($q$confraternizacoes$q$, $q$confraternizações$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 27, true),
  ($q$consulentes$q$, $q$consulentes$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 28, true),
  ($q$consultores$q$, $q$consultores$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 29, true),
  ($q$consultores-financeiros$q$, $q$consultores financeiros$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 30, true),
  ($q$convidados$q$, $q$convidados$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 31, true),
  ($q$coordenadores$q$, $q$coordenadores$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 32, true),
  ($q$coordenadores-de-arrecadacao$q$, $q$coordenadores de arrecadação$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 33, true),
  ($q$coordenacao$q$, $q$Coordenação$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 34, true),
  ($q$coordenacao-da-campanha$q$, $q$coordenação da campanha$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 35, true),
  ($q$coordenacao-da-festa$q$, $q$coordenação da festa$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 36, true),
  ($q$coordenacoes-de-campanhas-sociais$q$, $q$coordenações de campanhas sociais$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 37, true),
  ($q$cuidadores$q$, $q$cuidadores$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 38, true),
  ($q$curadores$q$, $q$curadores$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 39, true),
  ($q$diretoria$q$, $q$diretoria$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 40, true),
  ($q$dirigentes$q$, $q$Dirigentes$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 41, true),
  ($q$distribuem-alimentos$q$, $q$distribuem alimentos$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 42, true),
  ($q$distribuicao-de-alimentos$q$, $q$distribuição de alimentos$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 43, true),
  ($q$djs$q$, $q$DJs$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 44, true),
  ($q$doadores$q$, $q$doadores$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 45, true),
  ($q$empresas-de-nicho$q$, $q$empresas de nicho$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 46, true),
  ($q$equipes-voluntarias$q$, $q$equipes voluntárias$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 47, true),
  ($q$escolas$q$, $q$Escolas$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 48, true),
  ($q$especialistas$q$, $q$especialistas$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 49, true),
  ($q$estoque$q$, $q$estoque$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 50, true),
  ($q$eventos-beneficentes$q$, $q$eventos beneficentes$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 51, true),
  ($q$familias$q$, $q$Famílias$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 52, true),
  ($q$familias-com-acervos-musicais$q$, $q$famílias com acervos musicais$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 53, true),
  ($q$familias-com-idosos-independentes$q$, $q$Famílias com idosos independentes$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 54, true),
  ($q$familias-casais$q$, $q$famílias/casais$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 55, true),
  ($q$festas-escolares$q$, $q$festas escolares$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 56, true),
  ($q$festas-juninas$q$, $q$festas juninas$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 57, true),
  ($q$filhos-responsaveis$q$, $q$filhos responsáveis$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 58, true),
  ($q$garcons$q$, $q$garçons$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 59, true),
  ($q$grupos-de-trabalho-do-centro-tucxa$q$, $q$grupos de trabalho do Centro Tucxa$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 60, true),
  ($q$grupos-religiosos$q$, $q$grupos religiosos$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 61, true),
  ($q$grupos-voluntarios$q$, $q$grupos voluntários$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 62, true),
  ($q$igrejas$q$, $q$igrejas$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 63, true),
  ($q$instituicoes-que-arrecadam$q$, $q$instituições que arrecadam$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 64, true),
  ($q$lembrancinhas$q$, $q$lembrancinhas$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 65, true),
  ($q$liderancas-de-equipes$q$, $q$lideranças de equipes$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 66, true),
  ($q$lojas-de-usados$q$, $q$lojas de usados$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 67, true),
  ($q$meis$q$, $q$MEIs$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 68, true),
  ($q$midias-fisicas$q$, $q$mídias físicas$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 69, true),
  ($q$negocios-de-lembrancinhas$q$, $q$negócios de lembrancinhas$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 70, true),
  ($q$negocios-de-personalizados$q$, $q$negócios de personalizados$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 71, true),
  ($q$ong-amigos-de-pet$q$, $q$ONG Amigos de Pet$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 72, true),
  ($q$ongs$q$, $q$ONGs$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 73, true),
  ($q$organizadores-sociais$q$, $q$organizadores sociais$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 74, true),
  ($q$papelarias-criativas$q$, $q$Papelarias criativas$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 75, true),
  ($q$participantes-da-acao$q$, $q$participantes da ação$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 76, true),
  ($q$pequenos-e-commerces-por-encomenda$q$, $q$pequenos e-commerces por encomenda$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 77, true),
  ($q$pequenos-negocios$q$, $q$pequenos negócios$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 78, true),
  ($q$personal-trainers$q$, $q$Personal trainers$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 79, true),
  ($q$pessoas-fisicas-organizadas$q$, $q$Pessoas físicas organizadas$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 80, true),
  ($q$prestadores-de-apoio-60$q$, $q$prestadores de apoio 60+$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 81, true),
  ($q$prestadores-de-servico$q$, $q$prestadores de serviço$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 82, true),
  ($q$produtos-personalizados$q$, $q$produtos personalizados$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 83, true),
  ($q$professores-particulares$q$, $q$professores particulares$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 84, true),
  ($q$profissionais-autonomos$q$, $q$Profissionais autônomos$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 85, true),
  ($q$profissionais-com-clientes-recorrentes$q$, $q$profissionais com clientes recorrentes$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 86, true),
  ($q$projetos-sociais$q$, $q$projetos sociais$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 87, true),
  ($q$protetores$q$, $q$protetores$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 88, true),
  ($q$protetores-de-animais$q$, $q$protetores de animais$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 89, true),
  ($q$sebos$q$, $q$sebos$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 90, true),
  ($q$sementinha$q$, $q$Sementinha$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 91, true),
  ($q$terapeutas$q$, $q$terapeutas$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 92, true),
  ($q$tucxa-sementinha$q$, $q$Tucxa/Sementinha$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 93, true),
  ($q$voluntarios$q$, $q$voluntários$q$, $q$Público importado da planilha AE - Soluções.$q$, $q$Entender este público ajuda a transformar a solução em resultado percebido: menos esforço, mais clareza, segurança e decisão prática.$q$, 94, true)
on conflict (slug) do update set name = excluded.name, description = excluded.description, deep_dive_value = excluded.deep_dive_value, updated_at = now();

insert into public.ae_pains (slug, name, description, emotional_impact, sort_order, is_active) values
  ($q$acervo-em-planilhas-fotos-memoria$q$, $q$Acervo em planilhas/fotos/memória$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 1, true),
  ($q$acompanhantes-incertos$q$, $q$acompanhantes incertos$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 2, true),
  ($q$alimentos-vencendo$q$, $q$alimentos vencendo$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 3, true),
  ($q$ansiedade-do-organizador$q$, $q$ansiedade do organizador$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 4, true),
  ($q$apuracao-confusa$q$, $q$apuração confusa$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 5, true),
  ($q$ausencia-de-devolutiva-pratica$q$, $q$ausência de devolutiva prática$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 6, true),
  ($q$baixa-confianca$q$, $q$baixa confiança$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 7, true),
  ($q$baixa-escuta-dos-voluntarios$q$, $q$baixa escuta dos voluntários$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 8, true),
  ($q$baixa-participacao$q$, $q$baixa participação$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 9, true),
  ($q$baixa-percepcao-de-valor$q$, $q$baixa percepção de valor$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 10, true),
  ($q$baixa-percepcao-de-valor-artesanal$q$, $q$baixa percepção de valor artesanal$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 11, true),
  ($q$baixa-retencao$q$, $q$baixa retenção$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 12, true),
  ($q$baixa-transparencia$q$, $q$baixa transparência$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 13, true),
  ($q$baixa-visao-da-operacao$q$, $q$baixa visão da operação$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 14, true),
  ($q$cadastro-irregular$q$, $q$cadastro irregular$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 15, true),
  ($q$cadastro-sem-padrao$q$, $q$cadastro sem padrão$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 16, true),
  ($q$cartelas-dispersas$q$, $q$Cartelas dispersas$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 17, true),
  ($q$cartao-que-mascara-o-caixa$q$, $q$cartão que mascara o caixa$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 18, true),
  ($q$catalogo-confuso$q$, $q$Catálogo confuso$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 19, true),
  ($q$catalogo-sem-curadoria$q$, $q$catálogo sem curadoria$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 20, true),
  ($q$cliente-indecisa$q$, $q$Cliente indecisa$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 21, true),
  ($q$combinacoes-confusas$q$, $q$combinações confusas$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 22, true),
  ($q$compra-duplicada$q$, $q$compra duplicada$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 23, true),
  ($q$comprovantes-dispersos$q$, $q$comprovantes dispersos$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 24, true),
  ($q$comprovantes-duplicados$q$, $q$comprovantes duplicados$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 25, true),
  ($q$comprovantes-no-whatsapp$q$, $q$comprovantes no WhatsApp$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 26, true),
  ($q$comprovantes-soltos$q$, $q$comprovantes soltos$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 27, true),
  ($q$comunicacao-generica$q$, $q$Comunicação genérica$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 28, true),
  ($q$conferencia-manual$q$, $q$conferência manual$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 29, true),
  ($q$confirmacoes-espalhadas$q$, $q$Confirmações espalhadas$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 30, true),
  ($q$consultas-esquecidas$q$, $q$consultas esquecidas$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 31, true),
  ($q$contas-futuras-sem-visao$q$, $q$contas futuras sem visão$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 32, true),
  ($q$controle-manual$q$, $q$controle manual$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 33, true),
  ($q$controle-manual-de-participantes$q$, $q$controle manual de participantes$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 34, true),
  ($q$curriculo-sem-narrativa$q$, $q$currículo sem narrativa$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 35, true),
  ($q$decisoes-de-gasto-sem-seguranca$q$, $q$decisões de gasto sem segurança$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 36, true),
  ($q$decisoes-de-ultima-hora$q$, $q$decisões de última hora$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 37, true),
  ($q$decisoes-por-achismo$q$, $q$decisões por achismo$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 38, true),
  ($q$decisoes-sem-base$q$, $q$decisões sem base$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 39, true),
  ($q$decisoes-sem-dados$q$, $q$decisões sem dados$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 40, true),
  ($q$dependencia-de-favores$q$, $q$dependência de favores$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 41, true),
  ($q$dependencia-do-whatsapp$q$, $q$dependência do WhatsApp$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 42, true),
  ($q$dificuldade-de-alinhar-melhorias-por-publico$q$, $q$dificuldade de alinhar melhorias por público$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 43, true),
  ($q$dificuldade-de-encontrar-produto-vendido$q$, $q$dificuldade de encontrar produto vendido$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 44, true),
  ($q$dificuldade-de-escolher-combinacoes$q$, $q$dificuldade de escolher combinações$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 45, true),
  ($q$dificuldade-de-localizar-itens$q$, $q$dificuldade de localizar itens$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 46, true),
  ($q$dificuldade-de-mostrar-evolucao$q$, $q$dificuldade de mostrar evolução$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 47, true),
  ($q$dificuldade-de-priorizar-melhorias$q$, $q$dificuldade de priorizar melhorias$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 48, true),
  ($q$dificuldade-de-provar-valor$q$, $q$dificuldade de provar valor$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 49, true),
  ($q$dificuldade-de-transformar-problemas-em-plano-30-60-90-dias$q$, $q$dificuldade de transformar problemas em plano 30/60/90 dias$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 50, true),
  ($q$dificuldade-digital$q$, $q$Dificuldade digital$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 51, true),
  ($q$disputa-por-preco$q$, $q$disputa por preço$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 52, true),
  ($q$dores-espalhadas$q$, $q$Dores espalhadas$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 53, true),
  ($q$duvidas-sobre-temas-prazos$q$, $q$dúvidas sobre temas/prazos$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 54, true),
  ($q$estoque-fisico-confuso$q$, $q$estoque físico confuso$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 55, true),
  ($q$falta-de-capa-valor-estado$q$, $q$falta de capa/valor/estado$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 56, true),
  ($q$falta-de-lista-real-de-necessidades$q$, $q$falta de lista real de necessidades$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 57, true),
  ($q$falta-de-oferta-clara$q$, $q$falta de oferta clara$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 58, true),
  ($q$falta-de-previsibilidade$q$, $q$falta de previsibilidade$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 59, true),
  ($q$falta-de-previsibilidade-para-buffet$q$, $q$falta de previsibilidade para buffet$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 60, true),
  ($q$falta-de-ranking-de-prioridades$q$, $q$falta de ranking de prioridades$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 61, true),
  ($q$falta-de-visibilidade-da-rotina$q$, $q$falta de visibilidade da rotina$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 62, true),
  ($q$familiares-sobrecarregados$q$, $q$familiares sobrecarregados$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 63, true),
  ($q$fechamento-financeiro-trabalhoso$q$, $q$fechamento financeiro trabalhoso$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 64, true),
  ($q$fichas$q$, $q$fichas$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 65, true),
  ($q$fichas-em-papel$q$, $q$fichas em papel$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 66, true),
  ($q$fila-no-caixa$q$, $q$Fila no caixa$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 67, true),
  ($q$filas$q$, $q$Filas$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 68, true),
  ($q$follow-up-fraco$q$, $q$follow-up fraco$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 69, true),
  ($q$fotos$q$, $q$fotos$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 70, true),
  ($q$fotos-etiquetas-sem-padrao$q$, $q$fotos/etiquetas sem padrão$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 71, true),
  ($q$informacao-espalhada$q$, $q$Informação espalhada$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 72, true),
  ($q$inseguranca-de-pagamento$q$, $q$insegurança de pagamento$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 73, true),
  ($q$internet-processo-no-dia$q$, $q$internet/processo no dia$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 74, true),
  ($q$itens-unicos-dificeis-de-localizar$q$, $q$Itens únicos difíceis de localizar$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 75, true),
  ($q$itens-unicos-sem-controle$q$, $q$Itens únicos sem controle$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 76, true),
  ($q$lembrancas$q$, $q$lembranças$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 77, true),
  ($q$links-perdidos-apos-pix$q$, $q$links perdidos após Pix$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 78, true),
  ($q$medo-de-golpes$q$, $q$medo de golpes$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 79, true),
  ($q$medo-de-se-expor$q$, $q$medo de se expor$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 80, true),
  ($q$memoria-do-cliente-espalhada$q$, $q$memória do cliente espalhada$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 81, true),
  ($q$mensagens-dispersas$q$, $q$mensagens dispersas$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 82, true),
  ($q$mensagens-manuais$q$, $q$mensagens manuais$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 83, true),
  ($q$mistura-pf-pj$q$, $q$mistura PF/PJ$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 84, true),
  ($q$numeros-controlados-manualmente$q$, $q$Números controlados manualmente$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 85, true),
  ($q$opinioes-dispersas$q$, $q$Opiniões dispersas$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 86, true),
  ($q$orcamento-manual$q$, $q$orçamento manual$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 87, true),
  ($q$pagamento-manual$q$, $q$pagamento manual$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 88, true),
  ($q$papel$q$, $q$papel$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 89, true),
  ($q$pedidos-confusos$q$, $q$pedidos confusos$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 90, true),
  ($q$pedidos-por-responsavel-sem-consolidacao$q$, $q$pedidos por responsável sem consolidação$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 91, true),
  ($q$pendentes-sem-retorno$q$, $q$pendentes sem retorno$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 92, true),
  ($q$percepcoes-soltas$q$, $q$Percepções soltas$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 93, true),
  ($q$perda-de-timing-comercial$q$, $q$perda de timing comercial$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 94, true),
  ($q$pix$q$, $q$Pix$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 95, true),
  ($q$pix-manual$q$, $q$Pix manual$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 96, true),
  ($q$planilhas-cansativas$q$, $q$Planilhas cansativas$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 97, true),
  ($q$pouca-diferenciacao-frente-ao-mercado$q$, $q$pouca diferenciação frente ao mercado$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 98, true),
  ($q$pouca-protecao-para-venda$q$, $q$pouca proteção para venda$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 99, true),
  ($q$pouca-transparencia-final$q$, $q$pouca transparência final$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 100, true),
  ($q$pouca-transparencia-para-participantes$q$, $q$pouca transparência para participantes$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 101, true),
  ($q$prestacao-de-contas-dificil$q$, $q$prestação de contas difícil$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 102, true),
  ($q$prestacao-de-contas-trabalhosa$q$, $q$prestação de contas trabalhosa$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 103, true),
  ($q$prioridades-divergentes$q$, $q$prioridades divergentes$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 104, true),
  ($q$receio-de-exposicao$q$, $q$receio de exposição$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 105, true),
  ($q$reserva-manual$q$, $q$reserva manual$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 106, true),
  ($q$responsabilidade-concentrada$q$, $q$responsabilidade concentrada$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 107, true),
  ($q$retrabalho-no-caixa$q$, $q$retrabalho no caixa$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 108, true),
  ($q$retrabalho-para-aprovar-pagamentos$q$, $q$retrabalho para aprovar pagamentos$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 109, true),
  ($q$risco-de-duplicidade$q$, $q$risco de duplicidade$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 110, true),
  ($q$seguro-ou-heranca$q$, $q$seguro ou herança$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 111, true),
  ($q$selecao-de-numeros-perdida-ao-abrir-o-banco$q$, $q$Seleção de números perdida ao abrir o banco$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 112, true),
  ($q$separacao-retirada-confusas$q$, $q$separação/retirada confusas$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 113, true),
  ($q$venda-muito-dependente-do-whatsapp$q$, $q$venda muito dependente do WhatsApp$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 114, true),
  ($q$whatsapp-desorganizado$q$, $q$WhatsApp desorganizado$q$, $q$Dor importada da planilha AE - Soluções.$q$, $q$Esta dor deve ser traduzida na oferta como alívio de ansiedade, economia de tempo, segurança operacional ou clareza para decidir.$q$, 115, true)
on conflict (slug) do update set name = excluded.name, description = excluded.description, emotional_impact = excluded.emotional_impact, updated_at = now();

insert into public.ae_features (slug, name, category, description, value_reason, deep_dive_benefit, sort_order, is_active) values
  ($q$pagina-landing-mobile-first$q$, $q$Página/landing mobile-first$q$, $q$Presença digital$q$, $q$Página pública clara, responsiva e com CTA para diagnóstico, compra, confirmação ou ação principal.$q$, $q$para reduzir atrito de acesso no celular$q$, $q$a pessoa consegue agir na hora, sem depender de explicações longas no WhatsApp.$q$, 1, true),
  ($q$diagnostico-guiado$q$, $q$Diagnóstico guiado$q$, $q$Comercial$q$, $q$Perguntas simples que revelam público, dor, urgência e melhor solução.$q$, $q$para transformar conversa solta em decisão orientada$q$, $q$o cliente sente clareza e percebe que a solução nasceu da dor real dele.$q$, 2, true),
  ($q$gestao-leads-funil$q$, $q$Gestão de leads e funil$q$, $q$Comercial$q$, $q$Controle de leads, origem, prioridade, etapa, próximo contato e conversão.$q$, $q$para não perder oportunidades por falta de acompanhamento$q$, $q$a operação ganha previsibilidade comercial e reduz esquecimento de follow-up.$q$, 3, true),
  ($q$cadastro-clientes$q$, $q$Cadastro de clientes$q$, $q$Gestão$q$, $q$Cadastro central de clientes, status, plano, contato e histórico.$q$, $q$para organizar a carteira em um só lugar$q$, $q$a AE evita retrabalho e consegue atender mais clientes com o mesmo padrão.$q$, 4, true),
  ($q$sites-paginas-clientes$q$, $q$Sites/páginas de clientes$q$, $q$Gestão$q$, $q$Associação de páginas, campanhas, eventos e cases a uma solução e a um cliente.$q$, $q$para centralizar o ecossistema dentro da Automação Extrema$q$, $q$cada cliente vira caso rastreável, demonstrável e reaproveitável.$q$, 5, true),
  ($q$planos-funcionalidades$q$, $q$Planos e funcionalidades$q$, $q$Produto$q$, $q$Configuração de planos, recursos incluídos, limites, destaque e comparação.$q$, $q$para vender valor por escopo sem mexer no código$q$, $q$o cliente entende claramente o que ganha e o que deixa de ter.$q$, 6, true),
  ($q$mensagens-follow-up$q$, $q$Mensagens e follow-up$q$, $q$Operação$q$, $q$Templates e lembretes por fase, público, canal e momento da jornada.$q$, $q$para evitar mensagens manuais repetitivas$q$, $q$a comunicação fica mais cuidadosa, previsível e menos dependente de memória.$q$, 7, true),
  ($q$relatorios-indicadores$q$, $q$Relatórios e indicadores$q$, $q$Indicadores$q$, $q$Painéis e relatórios de operação, conversão, pendências e resultados.$q$, $q$para transformar dados em decisão$q$, $q$a pessoa para de decidir por achismo e ganha segurança para priorizar.$q$, 8, true),
  ($q$pix-comprovantes$q$, $q$Pix e comprovantes$q$, $q$Pagamentos$q$, $q$Controle de QR Code, Pix copia e cola, upload, aprovação e rastreio de comprovantes.$q$, $q$para reduzir confusão financeira e provas soltas$q$, $q$a operação ganha confiança, transparência e menos retrabalho.$q$, 9, true),
  ($q$reserva-cotas-numeros$q$, $q$Reserva de cotas/números$q$, $q$Campanhas$q$, $q$Reserva temporária de números, cotas, itens ou vagas com status claro.$q$, $q$para evitar duplicidade e conflito de escolha$q$, $q$o participante sente segurança e o gestor não precisa resolver disputa manual.$q$, 10, true),
  ($q$convidados-rsvp$q$, $q$Convidados e RSVP$q$, $q$Eventos$q$, $q$Lista de convidados, confirmação, acompanhantes, grupos, pendentes e status.$q$, $q$para prever presença e operação do evento$q$, $q$o organizador reduz ansiedade e decide buffet, lembranças e comunicação com mais controle.$q$, 11, true),
  ($q$prestacao-contas$q$, $q$Prestação de contas$q$, $q$Financeiro$q$, $q$Resumo de entradas, aprovações, resultados e evidências da ação.$q$, $q$para aumentar confiança na entrega$q$, $q$doadores, coordenação e parceiros enxergam transparência e profissionalismo.$q$, 12, true),
  ($q$catalogo-visual$q$, $q$Catálogo visual$q$, $q$Catálogo$q$, $q$Cadastro organizado com fotos, categorias, temas, estado, valor e busca.$q$, $q$para tornar itens e ofertas fáceis de escolher$q$, $q$o cliente percebe valor e decide sem depender de longas conversas.$q$, 13, true),
  ($q$estoque-itens$q$, $q$Controle de estoque/itens$q$, $q$Operação$q$, $q$Controle de itens únicos, estoque, validade, localização, separação e retirada.$q$, $q$para evitar perda, duplicidade e confusão operacional$q$, $q$a equipe ganha ordem e evita desgaste na entrega.$q$, 14, true),
  ($q$importacao-csv$q$, $q$Importação CSV$q$, $q$Operação$q$, $q$Importação estruturada de listas, convidados, itens ou bases existentes.$q$, $q$para acelerar implantação e reduzir digitação$q$, $q$a solução começa mais rápido e com menos erro humano.$q$, 15, true),
  ($q$prova-social-pos-evento$q$, $q$Prova social e pós-evento$q$, $q$Relacionamento$q$, $q$Recados, depoimentos, galeria, agradecimento e material para case.$q$, $q$para transformar entrega em prova de valor$q$, $q$a solução cria lembrança, reputação e argumento comercial para novas vendas.$q$, 16, true),
  ($q$portal-familiar-cliente$q$, $q$Portal familiar/cliente$q$, $q$Cliente$q$, $q$Área do cliente/família para acompanhar rotina, evento, campanha ou serviço.$q$, $q$para dar visibilidade sem invadir a operação$q$, $q$quem contrata sente tranquilidade e percebe cuidado contínuo.$q$, 17, true),
  ($q$agenda-lembretes$q$, $q$Agenda e lembretes$q$, $q$Rotina$q$, $q$Controle de compromissos, vencimentos, tarefas, retornos e alertas.$q$, $q$para prevenir esquecimentos e decisões em cima da hora$q$, $q$a pessoa ganha tempo, previsibilidade e menos ansiedade.$q$, 18, true),
  ($q$conciliacao-financeira$q$, $q$Conciliação financeira$q$, $q$Financeiro$q$, $q$Comparação entre previsto, realizado, comprovantes, cartão, Pix e caixa futuro.$q$, $q$para revelar riscos antes do problema acontecer$q$, $q$a pessoa decide com segurança e dorme melhor sabendo o que vem pela frente.$q$, 19, true),
  ($q$pedidos-cardapio-caixa$q$, $q$Pedidos, cardápio e caixa$q$, $q$Eventos$q$, $q$Operação de pedidos, cardápio, combos, responsáveis, caixa e conferência.$q$, $q$para diminuir fila, papel e retrabalho$q$, $q$o evento flui melhor e a prestação de contas fica mais simples.$q$, 20, true)
on conflict (slug) do update set name = excluded.name, category = excluded.category, description = excluded.description, value_reason = excluded.value_reason, deep_dive_benefit = excluded.deep_dive_benefit, updated_at = now();

-- Associações solução x públicos/dor/funcionalidades geradas a partir da planilha e palavras-chave
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$escolas$q$,$q$igrejas$q$,$q$associacoes$q$,$q$festas-juninas$q$,$q$eventos-beneficentes$q$,$q$equipes-voluntarias$q$) where s.slug = $q$festa-no-controle$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$filas$q$,$q$papel$q$,$q$fichas$q$,$q$pix-manual$q$,$q$pedidos-confusos$q$,$q$retrabalho-no-caixa$q$,$q$baixa-visao-da-operacao$q$,$q$prestacao-de-contas-trabalhosa$q$) where s.slug = $q$festa-no-controle$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$pagina-landing-mobile-first$q$,$q$relatorios-indicadores$q$,$q$pix-comprovantes$q$,$q$prestacao-contas$q$,$q$conciliacao-financeira$q$,$q$pedidos-cardapio-caixa$q$) where s.slug = $q$festa-no-controle$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_client_sites (solution_id, client_name, site_name, slug, url, public_path, page_type, status, notes)
select s.id, $q$Festa no Controle$q$, $q$Festa no Controle$q$, $q$festa-no-controle$q$, $q$https://festa-no-controle.vercel.app/$q$, null, $q$site_cliente$q$, 'em_migracao', $q$Carga inicial gerada a partir da planilha AE - Soluções.$q$ from public.ae_solutions s where s.slug = $q$festa-no-controle$q$
on conflict (slug) do update set solution_id = excluded.solution_id, client_name = excluded.client_name, site_name = excluded.site_name, url = excluded.url, page_type = excluded.page_type, status = excluded.status, updated_at = now();
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$personal-trainers$q$,$q$terapeutas$q$,$q$consultores$q$,$q$coaches$q$,$q$professores-particulares$q$,$q$profissionais-com-clientes-recorrentes$q$) where s.slug = $q$jornada-personal-extrema$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$whatsapp-desorganizado$q$,$q$memoria-do-cliente-espalhada$q$,$q$follow-up-fraco$q$,$q$perda-de-timing-comercial$q$,$q$baixa-retencao$q$,$q$dificuldade-de-mostrar-evolucao$q$) where s.slug = $q$jornada-personal-extrema$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$gestao-leads-funil$q$,$q$cadastro-clientes$q$,$q$mensagens-follow-up$q$,$q$prova-social-pos-evento$q$,$q$pagina-landing-mobile-first$q$,$q$relatorios-indicadores$q$) where s.slug = $q$jornada-personal-extrema$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$familias$q$,$q$aniversarios$q$,$q$casamentos$q$,$q$bodas$q$,$q$confraternizacoes$q$,$q$cerimonialistas$q$,$q$buffets$q$,$q$organizadores-sociais$q$) where s.slug = $q$presenca-querida$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$confirmacoes-espalhadas$q$,$q$ansiedade-do-organizador$q$,$q$pendentes-sem-retorno$q$,$q$acompanhantes-incertos$q$,$q$mensagens-manuais$q$,$q$falta-de-previsibilidade-para-buffet$q$,$q$lembrancas$q$) where s.slug = $q$presenca-querida$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$mensagens-follow-up$q$,$q$convidados-rsvp$q$,$q$prova-social-pos-evento$q$,$q$portal-familiar-cliente$q$,$q$agenda-lembretes$q$,$q$pagina-landing-mobile-first$q$,$q$relatorios-indicadores$q$) where s.slug = $q$presenca-querida$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_client_sites (solution_id, client_name, site_name, slug, url, public_path, page_type, status, notes)
select s.id, $q$Presença Querida$q$, $q$Presença Querida$q$, $q$presenca-querida$q$, $q$https://presenca-querida.vercel.app/$q$, null, $q$site_cliente$q$, 'em_migracao', $q$Carga inicial gerada a partir da planilha AE - Soluções.$q$ from public.ae_solutions s where s.slug = $q$presenca-querida$q$
on conflict (slug) do update set solution_id = excluded.solution_id, client_name = excluded.client_name, site_name = excluded.site_name, url = excluded.url, page_type = excluded.page_type, status = excluded.status, updated_at = now();
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$colecionadores-de-vinil$q$,$q$cds$q$,$q$midias-fisicas$q$,$q$djs$q$,$q$sebos$q$,$q$lojas-de-usados$q$,$q$curadores$q$,$q$familias-com-acervos-musicais$q$) where s.slug = $q$discoteca-digital$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$acervo-em-planilhas-fotos-memoria$q$,$q$compra-duplicada$q$,$q$dificuldade-de-localizar-itens$q$,$q$falta-de-capa-valor-estado$q$,$q$pouca-protecao-para-venda$q$,$q$seguro-ou-heranca$q$) where s.slug = $q$discoteca-digital$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$catalogo-visual$q$,$q$estoque-itens$q$,$q$importacao-csv$q$,$q$prova-social-pos-evento$q$,$q$portal-familiar-cliente$q$,$q$pagina-landing-mobile-first$q$,$q$relatorios-indicadores$q$) where s.slug = $q$discoteca-digital$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$familias-com-idosos-independentes$q$,$q$filhos-responsaveis$q$,$q$cuidadores$q$,$q$acompanhantes$q$,$q$prestadores-de-apoio-60$q$) where s.slug = $q$familia-presente-60$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$dificuldade-digital$q$,$q$familiares-sobrecarregados$q$,$q$consultas-esquecidas$q$,$q$medo-de-golpes$q$,$q$mensagens-dispersas$q$,$q$dependencia-de-favores$q$,$q$falta-de-visibilidade-da-rotina$q$) where s.slug = $q$familia-presente-60$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$mensagens-follow-up$q$,$q$convidados-rsvp$q$,$q$portal-familiar-cliente$q$,$q$agenda-lembretes$q$,$q$pagina-landing-mobile-first$q$,$q$relatorios-indicadores$q$) where s.slug = $q$familia-presente-60$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$associacoes$q$,$q$escolas$q$,$q$grupos-religiosos$q$,$q$comunidades$q$,$q$ongs$q$,$q$pequenos-negocios$q$,$q$projetos-sociais$q$,$q$liderancas-de-equipes$q$) where s.slug = $q$escuta-viva$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$opinioes-dispersas$q$,$q$decisoes-por-achismo$q$,$q$baixa-participacao$q$,$q$medo-de-se-expor$q$,$q$dificuldade-de-priorizar-melhorias$q$,$q$ausencia-de-devolutiva-pratica$q$) where s.slug = $q$escuta-viva$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$diagnostico-guiado$q$,$q$planos-funcionalidades$q$,$q$relatorios-indicadores$q$,$q$pagina-landing-mobile-first$q$) where s.slug = $q$escuta-viva$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$pessoas-fisicas-organizadas$q$,$q$familias-casais$q$,$q$autonomos$q$,$q$meis$q$,$q$prestadores-de-servico$q$,$q$consultores-financeiros$q$) where s.slug = $q$caixa-claro$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$planilhas-cansativas$q$,$q$falta-de-previsibilidade$q$,$q$cartao-que-mascara-o-caixa$q$,$q$contas-futuras-sem-visao$q$,$q$mistura-pf-pj$q$,$q$decisoes-de-gasto-sem-seguranca$q$) where s.slug = $q$caixa-claro$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$gestao-leads-funil$q$,$q$importacao-csv$q$,$q$portal-familiar-cliente$q$,$q$agenda-lembretes$q$,$q$conciliacao-financeira$q$,$q$pedidos-cardapio-caixa$q$,$q$pagina-landing-mobile-first$q$,$q$relatorios-indicadores$q$) where s.slug = $q$caixa-claro$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$papelarias-criativas$q$,$q$artesaos$q$,$q$negocios-de-lembrancinhas$q$,$q$produtos-personalizados$q$,$q$clientes-de-festas-escolares-familiares$q$) where s.slug = $q$encanto-no-controle-site-cliente$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$catalogo-confuso$q$,$q$dificuldade-de-escolher-combinacoes$q$,$q$orcamento-manual$q$,$q$duvidas-sobre-temas-prazos$q$,$q$baixa-percepcao-de-valor$q$,$q$venda-muito-dependente-do-whatsapp$q$) where s.slug = $q$encanto-no-controle-site-cliente$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$pagina-landing-mobile-first$q$,$q$cadastro-clientes$q$,$q$sites-paginas-clientes$q$,$q$mensagens-follow-up$q$,$q$catalogo-visual$q$,$q$portal-familiar-cliente$q$,$q$relatorios-indicadores$q$) where s.slug = $q$encanto-no-controle-site-cliente$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_client_sites (solution_id, client_name, site_name, slug, url, public_path, page_type, status, notes)
select s.id, $q$Laços & Letras Papelaria Criativa$q$, $q$Laços & Letras Papelaria Criativa$q$, $q$lacos-letras-papelaria-criativa$q$, null, null, $q$site_cliente$q$, 'em_migracao', $q$Carga inicial gerada a partir da planilha AE - Soluções.$q$ from public.ae_solutions s where s.slug = $q$encanto-no-controle-site-cliente$q$
on conflict (slug) do update set solution_id = excluded.solution_id, client_name = excluded.client_name, site_name = excluded.site_name, url = excluded.url, page_type = excluded.page_type, status = excluded.status, updated_at = now();
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$profissionais-autonomos$q$,$q$especialistas$q$,$q$consultores$q$,$q$prestadores-de-servico$q$,$q$pequenos-negocios$q$,$q$empresas-de-nicho$q$) where s.slug = $q$dna-de-valor$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$comunicacao-generica$q$,$q$disputa-por-preco$q$,$q$curriculo-sem-narrativa$q$,$q$dificuldade-de-provar-valor$q$,$q$falta-de-oferta-clara$q$,$q$pouca-diferenciacao-frente-ao-mercado$q$) where s.slug = $q$dna-de-valor$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$diagnostico-guiado$q$,$q$planos-funcionalidades$q$,$q$pagina-landing-mobile-first$q$,$q$relatorios-indicadores$q$) where s.slug = $q$dna-de-valor$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$eventos-beneficentes$q$,$q$festas-juninas$q$,$q$escolas$q$,$q$igrejas$q$,$q$associacoes$q$,$q$campanhas-do-sementinha-tucxa$q$,$q$equipes-voluntarias$q$) where s.slug = $q$modulo-do-festa-no-controle$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$cartelas-dispersas$q$,$q$controle-manual$q$,$q$pix$q$,$q$comprovantes-no-whatsapp$q$,$q$risco-de-duplicidade$q$,$q$apuracao-confusa$q$,$q$pouca-transparencia-para-participantes$q$) where s.slug = $q$modulo-do-festa-no-controle$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$sites-paginas-clientes$q$,$q$mensagens-follow-up$q$,$q$pix-comprovantes$q$,$q$reserva-cotas-numeros$q$,$q$prestacao-contas$q$,$q$pagina-landing-mobile-first$q$,$q$relatorios-indicadores$q$) where s.slug = $q$modulo-do-festa-no-controle$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_client_sites (solution_id, client_name, site_name, slug, url, public_path, page_type, status, notes)
select s.id, $q$Bingo Sementinha$q$, $q$Bingo Sementinha$q$, $q$bingo-sementinha$q$, $q$https://bingo-sementinha.vercel.app/$q$, null, $q$campanha$q$, 'em_migracao', $q$Carga inicial gerada a partir da planilha AE - Soluções.$q$ from public.ae_solutions s where s.slug = $q$modulo-do-festa-no-controle$q$
on conflict (slug) do update set solution_id = excluded.solution_id, client_name = excluded.client_name, site_name = excluded.site_name, url = excluded.url, page_type = excluded.page_type, status = excluded.status, updated_at = now();
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$centro-tucxa$q$,$q$coordenacao-da-festa$q$,$q$voluntarios$q$,$q$garcons$q$,$q$caixa$q$,$q$compradores$q$,$q$familias$q$,$q$convidados$q$) where s.slug = $q$festa-no-controle-site-cliente$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$fila-no-caixa$q$,$q$fichas-em-papel$q$,$q$pedidos-por-responsavel-sem-consolidacao$q$,$q$conferencia-manual$q$,$q$internet-processo-no-dia$q$,$q$fechamento-financeiro-trabalhoso$q$) where s.slug = $q$festa-no-controle-site-cliente$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$pagina-landing-mobile-first$q$,$q$cadastro-clientes$q$,$q$sites-paginas-clientes$q$,$q$relatorios-indicadores$q$,$q$convidados-rsvp$q$,$q$portal-familiar-cliente$q$,$q$conciliacao-financeira$q$,$q$pedidos-cardapio-caixa$q$) where s.slug = $q$festa-no-controle-site-cliente$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_client_sites (solution_id, client_name, site_name, slug, url, public_path, page_type, status, notes)
select s.id, $q$Festa Junina Tucxa$q$, $q$Festa Junina Tucxa$q$, $q$festa-junina-tucxa$q$, $q$https://tucxa-festa-junina.vercel.app/festa-junina$q$, null, $q$site_cliente$q$, 'em_migracao', $q$Carga inicial gerada a partir da planilha AE - Soluções.$q$ from public.ae_solutions s where s.slug = $q$festa-no-controle-site-cliente$q$
on conflict (slug) do update set solution_id = excluded.solution_id, client_name = excluded.client_name, site_name = excluded.site_name, url = excluded.url, page_type = excluded.page_type, status = excluded.status, updated_at = now();
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$ongs$q$,$q$protetores-de-animais$q$,$q$igrejas$q$,$q$escolas$q$,$q$grupos-voluntarios$q$,$q$campanhas-solidarias$q$,$q$coordenadores-de-arrecadacao$q$) where s.slug = $q$impacto-no-controle$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$numeros-controlados-manualmente$q$,$q$links-perdidos-apos-pix$q$,$q$comprovantes-soltos$q$,$q$baixa-confianca$q$,$q$retrabalho-para-aprovar-pagamentos$q$,$q$pouca-transparencia-final$q$) where s.slug = $q$impacto-no-controle$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$pagina-landing-mobile-first$q$,$q$sites-paginas-clientes$q$,$q$relatorios-indicadores$q$,$q$pix-comprovantes$q$,$q$reserva-cotas-numeros$q$,$q$prestacao-contas$q$,$q$conciliacao-financeira$q$) where s.slug = $q$impacto-no-controle$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_client_sites (solution_id, client_name, site_name, slug, url, public_path, page_type, status, notes)
select s.id, $q$Impacto no Controle$q$, $q$Impacto no Controle$q$, $q$impacto-no-controle$q$, $q$https://impacto-no-controle.vercel.app/$q$, null, $q$campanha$q$, 'em_migracao', $q$Carga inicial gerada a partir da planilha AE - Soluções.$q$ from public.ae_solutions s where s.slug = $q$impacto-no-controle$q$
on conflict (slug) do update set solution_id = excluded.solution_id, client_name = excluded.client_name, site_name = excluded.site_name, url = excluded.url, page_type = excluded.page_type, status = excluded.status, updated_at = now();
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$grupos-voluntarios$q$,$q$centros-religiosos$q$,$q$ongs$q$,$q$igrejas$q$,$q$associacoes$q$,$q$instituicoes-que-arrecadam$q$,$q$distribuem-alimentos$q$) where s.slug = $q$sementinha-no-controle$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$informacao-espalhada$q$,$q$responsabilidade-concentrada$q$,$q$alimentos-vencendo$q$,$q$decisoes-de-ultima-hora$q$,$q$falta-de-lista-real-de-necessidades$q$,$q$prestacao-de-contas-dificil$q$) where s.slug = $q$sementinha-no-controle$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$relatorios-indicadores$q$,$q$prestacao-contas$q$,$q$estoque-itens$q$,$q$conciliacao-financeira$q$,$q$pagina-landing-mobile-first$q$) where s.slug = $q$sementinha-no-controle$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_client_sites (solution_id, client_name, site_name, slug, url, public_path, page_type, status, notes)
select s.id, $q$Sementinha Alimentos$q$, $q$Sementinha Alimentos$q$, $q$sementinha-alimentos$q$, $q$https://sementinha-alimentos.vercel.app/$q$, null, $q$site_cliente$q$, 'em_migracao', $q$Carga inicial gerada a partir da planilha AE - Soluções.$q$ from public.ae_solutions s where s.slug = $q$sementinha-no-controle$q$
on conflict (slug) do update set solution_id = excluded.solution_id, client_name = excluded.client_name, site_name = excluded.site_name, url = excluded.url, page_type = excluded.page_type, status = excluded.status, updated_at = now();
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$coordenacao$q$,$q$voluntarios$q$,$q$diretoria$q$,$q$doadores$q$,$q$apoiadores-envolvidos-com-arrecadacao$q$,$q$estoque$q$,$q$distribuicao-de-alimentos$q$) where s.slug = $q$escuta-viva-site-cliente$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$percepcoes-soltas$q$,$q$prioridades-divergentes$q$,$q$baixa-escuta-dos-voluntarios$q$,$q$decisoes-sem-dados$q$,$q$dificuldade-de-transformar-problemas-em-plano-30-60-90-dias$q$) where s.slug = $q$escuta-viva-site-cliente$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$pagina-landing-mobile-first$q$,$q$diagnostico-guiado$q$,$q$cadastro-clientes$q$,$q$sites-paginas-clientes$q$,$q$planos-funcionalidades$q$,$q$relatorios-indicadores$q$,$q$prestacao-contas$q$,$q$estoque-itens$q$) where s.slug = $q$escuta-viva-site-cliente$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_client_sites (solution_id, client_name, site_name, slug, url, public_path, page_type, status, notes)
select s.id, $q$Pesquisa Sementinha Alimentos$q$, $q$Pesquisa Sementinha Alimentos$q$, $q$pesquisa-sementinha-alimentos$q$, $q$https://sementinha-alimentos.vercel.app/pesquisa-sementinha$q$, null, $q$pesquisa$q$, 'em_migracao', $q$Carga inicial gerada a partir da planilha AE - Soluções.$q$ from public.ae_solutions s where s.slug = $q$escuta-viva-site-cliente$q$
on conflict (slug) do update set solution_id = excluded.solution_id, client_name = excluded.client_name, site_name = excluded.site_name, url = excluded.url, page_type = excluded.page_type, status = excluded.status, updated_at = now();
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$sementinha$q$,$q$bazares-beneficentes$q$,$q$voluntarios$q$,$q$compradores-locais$q$,$q$doadores$q$,$q$coordenacoes-de-campanhas-sociais$q$) where s.slug = $q$bazar-no-controle-site-cliente$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$itens-unicos-dificeis-de-localizar$q$,$q$cadastro-irregular$q$,$q$fotos-etiquetas-sem-padrao$q$,$q$reserva-manual$q$,$q$comprovantes-dispersos$q$,$q$separacao-retirada-confusas$q$) where s.slug = $q$bazar-no-controle-site-cliente$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$pagina-landing-mobile-first$q$,$q$cadastro-clientes$q$,$q$sites-paginas-clientes$q$,$q$relatorios-indicadores$q$,$q$pix-comprovantes$q$,$q$reserva-cotas-numeros$q$,$q$prestacao-contas$q$,$q$catalogo-visual$q$,$q$estoque-itens$q$,$q$conciliacao-financeira$q$) where s.slug = $q$bazar-no-controle-site-cliente$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_client_sites (solution_id, client_name, site_name, slug, url, public_path, page_type, status, notes)
select s.id, $q$Bazar do Sementinha$q$, $q$Bazar do Sementinha$q$, $q$bazar-do-sementinha$q$, $q$https://bazar-sementinha-izzg.vercel.app/$q$, null, $q$site_cliente$q$, 'em_migracao', $q$Carga inicial gerada a partir da planilha AE - Soluções.$q$ from public.ae_solutions s where s.slug = $q$bazar-no-controle-site-cliente$q$
on conflict (slug) do update set solution_id = excluded.solution_id, client_name = excluded.client_name, site_name = excluded.site_name, url = excluded.url, page_type = excluded.page_type, status = excluded.status, updated_at = now();
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$ong-amigos-de-pet$q$,$q$tucxa-sementinha$q$,$q$protetores$q$,$q$doadores$q$,$q$participantes-da-acao$q$,$q$coordenacao-da-campanha$q$) where s.slug = $q$impacto-no-controle-site-cliente$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$selecao-de-numeros-perdida-ao-abrir-o-banco$q$,$q$controle-manual-de-participantes$q$,$q$comprovantes-duplicados$q$,$q$inseguranca-de-pagamento$q$,$q$prestacao-de-contas-trabalhosa$q$) where s.slug = $q$impacto-no-controle-site-cliente$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$pagina-landing-mobile-first$q$,$q$cadastro-clientes$q$,$q$sites-paginas-clientes$q$,$q$relatorios-indicadores$q$,$q$pix-comprovantes$q$,$q$reserva-cotas-numeros$q$,$q$convidados-rsvp$q$,$q$prestacao-contas$q$,$q$conciliacao-financeira$q$) where s.slug = $q$impacto-no-controle-site-cliente$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_client_sites (solution_id, client_name, site_name, slug, url, public_path, page_type, status, notes)
select s.id, $q$São Francisco em Ação$q$, $q$São Francisco em Ação$q$, $q$sao-francisco-em-acao$q$, $q$https://impacto-no-controle.vercel.app/acao/sao-francisco-em-racao$q$, null, $q$campanha$q$, 'em_migracao', $q$Carga inicial gerada a partir da planilha AE - Soluções.$q$ from public.ae_solutions s where s.slug = $q$impacto-no-controle-site-cliente$q$
on conflict (slug) do update set solution_id = excluded.solution_id, client_name = excluded.client_name, site_name = excluded.site_name, url = excluded.url, page_type = excluded.page_type, status = excluded.status, updated_at = now();
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$dirigentes$q$,$q$coordenadores$q$,$q$cambonos$q$,$q$consulentes$q$,$q$voluntarios$q$,$q$grupos-de-trabalho-do-centro-tucxa$q$) where s.slug = $q$escuta-viva-pesquisa-tucxa$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$dores-espalhadas$q$,$q$decisoes-sem-base$q$,$q$receio-de-exposicao$q$,$q$baixa-participacao$q$,$q$falta-de-ranking-de-prioridades$q$,$q$dificuldade-de-alinhar-melhorias-por-publico$q$) where s.slug = $q$escuta-viva-pesquisa-tucxa$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$pagina-landing-mobile-first$q$,$q$diagnostico-guiado$q$,$q$cadastro-clientes$q$,$q$sites-paginas-clientes$q$,$q$relatorios-indicadores$q$) where s.slug = $q$escuta-viva-pesquisa-tucxa$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_client_sites (solution_id, client_name, site_name, slug, url, public_path, page_type, status, notes)
select s.id, $q$Pesquisa Tucxa$q$, $q$Pesquisa Tucxa$q$, $q$pesquisa-tucxa$q$, $q$https://tucxa-escuta.vercel.app/$q$, null, $q$pesquisa$q$, 'em_migracao', $q$Carga inicial gerada a partir da planilha AE - Soluções.$q$ from public.ae_solutions s where s.slug = $q$escuta-viva-pesquisa-tucxa$q$
on conflict (slug) do update set solution_id = excluded.solution_id, client_name = excluded.client_name, site_name = excluded.site_name, url = excluded.url, page_type = excluded.page_type, status = excluded.status, updated_at = now();
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$papelarias-criativas$q$,$q$artesaos$q$,$q$negocios-de-personalizados$q$,$q$lembrancinhas$q$,$q$festas-escolares$q$,$q$pequenos-e-commerces-por-encomenda$q$) where s.slug = $q$encanto-no-controle$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$cliente-indecisa$q$,$q$combinacoes-confusas$q$,$q$orcamento-manual$q$,$q$dependencia-do-whatsapp$q$,$q$catalogo-sem-curadoria$q$,$q$baixa-percepcao-de-valor-artesanal$q$) where s.slug = $q$encanto-no-controle$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$gestao-leads-funil$q$,$q$cadastro-clientes$q$,$q$mensagens-follow-up$q$,$q$catalogo-visual$q$,$q$pagina-landing-mobile-first$q$,$q$relatorios-indicadores$q$) where s.slug = $q$encanto-no-controle$q$
on conflict (solution_id, feature_id) do nothing;
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, a.id, false from public.ae_solutions s join public.ae_target_audiences a on a.slug in ($q$bazares-beneficentes$q$,$q$brechos-sociais$q$,$q$ongs$q$,$q$igrejas$q$,$q$escolas$q$,$q$associacoes$q$,$q$campanhas-de-arrecadacao-com-itens-doados$q$) where s.slug = $q$bazar-no-controle$q$
on conflict (solution_id, target_audience_id) do nothing;
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, p.id, 'media' from public.ae_solutions s join public.ae_pains p on p.slug in ($q$itens-unicos-sem-controle$q$,$q$dificuldade-de-encontrar-produto-vendido$q$,$q$fotos$q$,$q$cadastro-sem-padrao$q$,$q$estoque-fisico-confuso$q$,$q$pagamento-manual$q$,$q$baixa-transparencia$q$) where s.slug = $q$bazar-no-controle$q$
on conflict (solution_id, pain_id) do nothing;
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, f.id, true, true from public.ae_solutions s join public.ae_features f on f.slug in ($q$sites-paginas-clientes$q$,$q$relatorios-indicadores$q$,$q$pix-comprovantes$q$,$q$reserva-cotas-numeros$q$,$q$prestacao-contas$q$,$q$catalogo-visual$q$,$q$estoque-itens$q$,$q$conciliacao-financeira$q$,$q$pagina-landing-mobile-first$q$) where s.slug = $q$bazar-no-controle$q$
on conflict (solution_id, feature_id) do nothing;

-- Parceiros iniciais estratégicos para validação comercial
insert into public.ae_partners (slug, name, partner_type, commission_percentage, status, notes) values
  ('cerimonialistas-parceiros', 'Cerimonialistas parceiros', 'cerimonialista', 10, 'em_validacao', 'Parceiros indicados para Presença Querida e eventos sociais.'),
  ('ongs-parceiras', 'ONGs parceiras', 'ong', 0, 'em_validacao', 'Parceiros indicados para Impacto no Controle, Sementinha e campanhas sociais.'),
  ('buffets-parceiros', 'Buffets parceiros', 'buffet', 8, 'em_validacao', 'Parceiros indicados para Presença Querida, Festa no Controle e eventos.')
on conflict (slug) do update set name = excluded.name, partner_type = excluded.partner_type, commission_percentage = excluded.commission_percentage, status = excluded.status, notes = excluded.notes, updated_at = now();

-- Conferência rápida
select 'solucoes' as item, count(*) from public.ae_solutions
union all select 'publicos', count(*) from public.ae_target_audiences
union all select 'dores', count(*) from public.ae_pains
union all select 'funcionalidades', count(*) from public.ae_features
union all select 'sites_clientes', count(*) from public.ae_client_sites
union all select 'parceiros', count(*) from public.ae_partners;