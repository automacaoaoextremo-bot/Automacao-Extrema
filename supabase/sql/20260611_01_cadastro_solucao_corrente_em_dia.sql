-- Automação Extrema — Corrente em Dia
-- 01. Cadastro da nova solução no catálogo AE
-- Execute no Supabase SQL Editor antes da base específica do Corrente em Dia.
-- Idempotente: pode rodar novamente sem duplicar a solução.

create extension if not exists "pgcrypto";

-- Garante slug único no catálogo principal.
create unique index if not exists idx_ae_solutions_slug_unique on public.ae_solutions(slug);

-- Solução principal.
insert into public.ae_solutions (
  name,
  slug,
  short_description,
  target_audience,
  main_pains,
  current_status,
  stage,
  priority,
  source_file,
  is_active
) values (
  'Corrente em Dia',
  'corrente-em-dia',
  'Gestão mobile-first e página simples para organizar arrecadações, Pix, comprovantes, aprovação humana e relatórios de federações, associações e terreiros.',
  'Federações, associações, terreiros de Umbanda, dirigentes, presidentes, tesoureiros, coordenadores, cavalinhos, cambonos, médiuns, consulentes contribuintes e famílias da corrente.',
  'Contribuições espalhadas no WhatsApp, Pix manual, comprovantes perdidos, dificuldade de saber quem contribuiu, baixa previsibilidade financeira, pouca transparência para diretoria e cobrança constrangedora.',
  'validado_para_mvp',
  'implementacao',
  30,
  'AE_Corrente_em_Dia_Proposta_Detalhada_Laercio_v5.docx',
  true
)
on conflict (slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  target_audience = excluded.target_audience,
  main_pains = excluded.main_pains,
  current_status = excluded.current_status,
  stage = excluded.stage,
  priority = excluded.priority,
  source_file = excluded.source_file,
  is_active = excluded.is_active;

-- Catálogos reutilizáveis da AE.
insert into public.ae_target_audiences (slug, name, description, deep_dive_value, sort_order, is_active) values
  ('federacoes-de-umbanda', 'Federações de Umbanda', 'Instituições que reúnem, orientam e representam terreiros vinculados.', 'Ganham organização, visão da rede e possibilidade de incentivo por indicação sem assumir custo de implantação.', 10, true),
  ('associacoes-de-umbanda', 'Associações de Umbanda', 'Associações regionais ou temáticas ligadas a casas, dirigentes e projetos comunitários.', 'Passam a apoiar terreiros com uma solução simples, clara e mensurável.', 11, true),
  ('terreiros-de-umbanda', 'Terreiros de Umbanda', 'Casas que precisam organizar contribuições de filhos da corrente, famílias e consulentes.', 'Mantêm a casa funcionando com previsibilidade, respeito e menos cobrança manual.', 12, true),
  ('gestores-de-terreiros', 'Gestores de terreiros', 'Presidentes, tesoureiros, dirigentes, pais/mães de santo, coordenadores e responsáveis financeiros.', 'Enxergam pagos, pendentes, divergentes e comprovantes sem depender de memória ou planilha confusa.', 13, true),
  ('contribuintes-da-corrente', 'Contribuintes da corrente', 'Cavalinhos, cambonos, médiuns, filhos da corrente, consulentes e famílias que contribuem.', 'Contribuem pelo celular com QR Code, histórico e mensagens respeitosas.', 14, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  deep_dive_value = excluded.deep_dive_value,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.ae_pains (slug, name, description, emotional_impact, sort_order, is_active) values
  ('pix-e-comprovantes-espalhados', 'Pix e comprovantes espalhados', 'Comprovantes chegam por WhatsApp, conversa privada ou papel e se perdem com facilidade.', 'Gera insegurança, retrabalho e medo de cobrar quem já pagou ou deixar de registrar quem contribuiu.', 10, true),
  ('falta-de-previsibilidade-da-casa', 'Falta de previsibilidade da casa', 'A casa não sabe com clareza quanto entrará no mês e quais contribuições ainda faltam.', 'A diretoria trabalha no escuro e fica difícil planejar contas, manutenção, limpeza, luz, água e ações sociais.', 11, true),
  ('cobranca-constrangedora', 'Cobrança constrangedora', 'Lembrar contribuições em atraso pelo WhatsApp pode soar como cobrança pessoal.', 'Desgasta relacionamentos e cria desconforto em um ambiente que deveria preservar acolhimento e respeito.', 12, true),
  ('dificuldade-digital-dos-gestores', 'Dificuldade digital dos gestores', 'Alguns responsáveis têm pouca familiaridade com celular, planilhas ou sistemas complexos.', 'Sistemas cheios de telas e termos técnicos travam a adoção e fazem a casa voltar ao controle manual.', 13, true),
  ('prestacao-de-contas-fragil', 'Prestação de contas frágil', 'Sem histórico organizado, fica difícil explicar entradas, pendências, divergências e repasses.', 'Reduz confiança e aumenta o peso da responsabilidade sobre presidente, tesoureiro e dirigentes.', 14, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  emotional_impact = excluded.emotional_impact,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.ae_features (slug, name, category, description, value_reason, deep_dive_benefit, sort_order, is_active) values
  ('cadastro-de-entidades-e-vinculos', 'Cadastro de federações, associações e terreiros', 'Cadastro', 'Permite registrar federações, associações, terreiros e vínculos entre eles.', 'Existe para mostrar claramente quem indica, quem acompanha e qual casa está arrecadando.', 'A rede ganha organização sem planilhas paralelas e sem perder a visão de cada casa.', 10, true),
  ('qr-code-pix-por-contribuicao', 'QR Code Pix por contribuição', 'Arrecadação', 'Gera QR Code e Pix copia e cola para cada contribuição mensal, familiar ou eventual.', 'Existe para facilitar a contribuição e reduzir erro de chave Pix ou valor.', 'O contribuinte resolve pelo celular em poucos segundos, sem procurar chave em mensagens antigas.', 11, true),
  ('upload-e-pre-validacao-de-comprovante', 'Upload e pré-validação de comprovante', 'Conferência', 'Recebe comprovante e compara valor, chave Pix, data, status e identificador quando possível.', 'Existe para reduzir conferência manual e sinalizar divergências antes da aprovação.', 'O gestor ganha segurança e evita aprovar comprovante errado, duplicado, agendado ou incompatível.', 12, true),
  ('aprovacao-humana-responsavel', 'Aprovação humana por responsável', 'Governança', 'Responsável revisa, aprova, reprova ou pede correção do comprovante.', 'Existe para manter confiança na V1 sem depender de gateway, split ou confirmação automática.', 'A casa começa rápido, com baixo custo, mantendo controle e rastreabilidade.', 13, true),
  ('painel-simples-mobile-e-computador', 'Painel simples para celular e computador', 'Gestão', 'Mostra arrecadado, pendente, em revisão, divergente e histórico com botões grandes.', 'Existe para atender gestores com diferentes níveis de familiaridade digital.', 'A diretoria entende a situação do mês sem precisar dominar planilhas ou sistemas complexos.', 14, true),
  ('lembretes-respeitosos-deep-dive', 'Lembretes respeitosos com Deep Dive', 'Comunicação', 'Mensagens de lembrete e agradecimento com tom de cuidado, continuidade e pertencimento.', 'Existe para substituir cobrança fria por comunicação que explica a importância da contribuição.', 'A corrente se mantém firme sem constrangimento e com mais consciência do valor coletivo.', 15, true)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  value_reason = excluded.value_reason,
  deep_dive_benefit = excluded.deep_dive_benefit,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- Associa solução aos catálogos.
with s as (
  select id from public.ae_solutions where slug = 'corrente-em-dia'
), audience as (
  select id, slug from public.ae_target_audiences where slug in (
    'federacoes-de-umbanda', 'associacoes-de-umbanda', 'terreiros-de-umbanda', 'gestores-de-terreiros', 'contribuintes-da-corrente'
  )
)
insert into public.ae_solution_target_audiences (solution_id, target_audience_id, is_primary)
select s.id, audience.id, audience.slug in ('terreiros-de-umbanda', 'gestores-de-terreiros')
from s cross join audience
on conflict (solution_id, target_audience_id) do update set is_primary = excluded.is_primary;

with s as (
  select id from public.ae_solutions where slug = 'corrente-em-dia'
), pains as (
  select id from public.ae_pains where slug in (
    'pix-e-comprovantes-espalhados', 'falta-de-previsibilidade-da-casa', 'cobranca-constrangedora', 'dificuldade-digital-dos-gestores', 'prestacao-de-contas-fragil'
  )
)
insert into public.ae_solution_pains (solution_id, pain_id, intensity)
select s.id, pains.id, 'alta'
from s cross join pains
on conflict (solution_id, pain_id) do update set intensity = excluded.intensity;

with s as (
  select id from public.ae_solutions where slug = 'corrente-em-dia'
), features as (
  select id, slug from public.ae_features where slug in (
    'cadastro-de-entidades-e-vinculos', 'qr-code-pix-por-contribuicao', 'upload-e-pre-validacao-de-comprovante', 'aprovacao-humana-responsavel', 'painel-simples-mobile-e-computador', 'lembretes-respeitosos-deep-dive'
  )
)
insert into public.ae_solution_features (solution_id, feature_id, is_core, is_visible)
select s.id, features.id, true, true
from s cross join features
on conflict (solution_id, feature_id) do update set is_core = excluded.is_core, is_visible = excluded.is_visible;
