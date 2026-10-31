begin;

-- StudyAgent V1 — cliente fundador Residência IA
-- Cria uma base de conhecimento genérica por programa e um grafo de pré-requisitos.
-- Não altera tabelas existentes de Memórias que Encantam/TUCXA.

create extension if not exists pgcrypto;

create table if not exists public.ae_study_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  founder_label text,
  source_label text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ae_study_level_definitions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  level_key text not null,
  label text not null,
  level_order integer not null check (level_order between 1 and 20),
  intent text not null,
  quiz_min numeric(5,2),
  practice_min numeric(5,2),
  explanation_min numeric(5,2),
  final_min numeric(5,2),
  created_at timestamptz not null default now(),
  unique(program_id, level_key),
  unique(program_id, level_order)
);

create table if not exists public.ae_study_competencies (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  code text not null,
  title text not null,
  summary text not null,
  category text not null,
  why_it_matters text not null,
  evidence_suggestion text not null,
  reflection_sources text[] not null default '{}',
  sort_order integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, code),
  unique(program_id, sort_order)
);

create table if not exists public.ae_study_competency_edges (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  from_competency_id uuid not null references public.ae_study_competencies(id) on delete cascade,
  to_competency_id uuid not null references public.ae_study_competencies(id) on delete cascade,
  relation_type text not null default 'prerequisite_of',
  rationale text,
  created_at timestamptz not null default now(),
  check (from_competency_id <> to_competency_id),
  unique(program_id, from_competency_id, to_competency_id, relation_type)
);

create index if not exists ae_study_competencies_program_idx
  on public.ae_study_competencies(program_id, sort_order);

create index if not exists ae_study_edges_from_idx
  on public.ae_study_competency_edges(program_id, from_competency_id);

create index if not exists ae_study_edges_to_idx
  on public.ae_study_competency_edges(program_id, to_competency_id);

alter table public.ae_study_programs enable row level security;
alter table public.ae_study_level_definitions enable row level security;
alter table public.ae_study_competencies enable row level security;
alter table public.ae_study_competency_edges enable row level security;

drop policy if exists "study_programs_public_read" on public.ae_study_programs;
create policy "study_programs_public_read"
  on public.ae_study_programs for select
  using (active = true);

drop policy if exists "study_levels_public_read" on public.ae_study_level_definitions;
create policy "study_levels_public_read"
  on public.ae_study_level_definitions for select
  using (
    exists (
      select 1 from public.ae_study_programs p
      where p.id = program_id and p.active = true
    )
  );

drop policy if exists "study_competencies_public_read" on public.ae_study_competencies;
create policy "study_competencies_public_read"
  on public.ae_study_competencies for select
  using (
    active = true
    and exists (
      select 1 from public.ae_study_programs p
      where p.id = program_id and p.active = true
    )
  );

drop policy if exists "study_edges_public_read" on public.ae_study_competency_edges;
create policy "study_edges_public_read"
  on public.ae_study_competency_edges for select
  using (
    exists (
      select 1 from public.ae_study_programs p
      where p.id = program_id and p.active = true
    )
  );

insert into public.ae_study_programs (
  id, slug, name, description, founder_label, source_label, active, updated_at
)
values (
  '7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid,
  'residencia-ia',
  'Residência IA',
  'Trilha de aprendizagem orientada por competências, evidências e relações de pré-requisito.',
  'Cliente fundador',
  'Reflections de 18/09, 25/09 e 02/10/2026',
  true,
  now()
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  founder_label = excluded.founder_label,
  source_label = excluded.source_label,
  active = excluded.active,
  updated_at = now();

insert into public.ae_study_level_definitions (
  program_id, level_key, label, level_order, intent,
  quiz_min, practice_min, explanation_min, final_min
)
values
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001', 'iniciante', 'Iniciante', 1, 'Reconhecer conceitos, vocabulário e o propósito da competência.', 80, 2, 2, 70),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001', 'basico', 'Básico', 2, 'Executar uma atividade simples com autonomia e explicar o resultado.', 80, 2, 2, 70),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001', 'intermediario', 'Intermediário', 3, 'Resolver um mini-case, justificar decisões e reconhecer limitações.', 80, 2, 2, 70),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001', 'avancado', 'Avançado', 4, 'Resolver um caso aberto, discutir trade-offs e produzir evidência reproduzível.', 80, 2, 2, 70)
on conflict (program_id, level_key) do update set
  label = excluded.label,
  level_order = excluded.level_order,
  intent = excluded.intent,
  quiz_min = excluded.quiz_min,
  practice_min = excluded.practice_min,
  explanation_min = excluded.explanation_min,
  final_min = excluded.final_min;


insert into public.ae_study_competencies (
  program_id, code, title, summary, category, why_it_matters,
  evidence_suggestion, reflection_sources, sort_order, active
)
values
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K01', 'Identificar problemas que podem ser resolvidos com IA', 'Separar problemas adequados para IA daqueles que pedem regra, automação tradicional, processo ou mudança operacional.', 'Fundamentos e enquadramento', 'Evita começar pela tecnologia antes de compreender a decisão, o dado disponível e o valor esperado.', 'Enquadramento de um problema real com objetivo, entrada, saída, restrições e justificativa para usar ou não IA.', ARRAY['02/10']::text[], 1, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K02', 'Selecionar abordagem/paradigma de IA adequado', 'Escolher entre abordagens como supervisionado, não supervisionado, regras, busca, geração ou combinação delas.', 'Fundamentos e enquadramento', 'Uma boa escolha de abordagem reduz complexidade e alinha o método ao tipo de resposta desejada.', 'Comparação de alternativas para um mesmo problema, com justificativa da abordagem escolhida.', ARRAY['25/09']::text[], 2, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K03', 'Aplicar aprendizado supervisionado e não supervisionado', 'Reconhecer quando há rótulos, quando não há e implementar exemplos simples dos dois paradigmas.', 'Fundamentos e enquadramento', 'É a ponte entre o enquadramento do problema e a implementação dos modelos de aprendizado.', 'Notebook comparando um exemplo supervisionado e um não supervisionado sobre dados apropriados.', ARRAY['02/10']::text[], 3, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K04', 'Realizar análise exploratória de dados (EDA)', 'Investigar estrutura, distribuição, qualidade, padrões e anomalias antes da modelagem.', 'Dados e entendimento', 'EDA reduz decisões baseadas em suposição e orienta limpeza, features, hipóteses e modelagem.', 'Notebook com perguntas, estatísticas descritivas, visualizações, achados e próximos passos.', ARRAY['18/09','02/10']::text[], 4, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K05', 'Aplicar conceitos estatísticos básicos', 'Usar medidas de tendência, dispersão, distribuição e noções de amostragem para interpretar dados.', 'Dados e entendimento', 'Fornece linguagem quantitativa para EDA, métricas, hipóteses e interpretação de resultados.', 'Análise curta explicando média, mediana, dispersão e distribuição em um conjunto de dados.', ARRAY['18/09']::text[], 5, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K06', 'Limpar e preparar dados (data cleaning)', 'Tratar ausências, duplicidades, tipos, inconsistências e formatos antes de análises e modelos.', 'Dados e entendimento', 'A qualidade do dado influencia diretamente a confiabilidade das conclusões e dos modelos.', 'Pipeline reproduzível de limpeza com justificativa das decisões e comparação antes/depois.', ARRAY['18/09','25/09']::text[], 6, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K07', 'Criar e selecionar features relevantes para modelos', 'Transformar dados brutos em atributos úteis e selecionar variáveis coerentes com o problema.', 'Preparação para modelagem', 'Boas features podem melhorar desempenho, interpretabilidade e robustez mais do que trocar de algoritmo.', 'Comparação de conjunto base e conjunto com features, explicando impacto e risco de leakage.', ARRAY['25/09','02/10']::text[], 7, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K08', 'Aplicar técnicas de visualização de dados', 'Escolher gráficos adequados à pergunta e comunicar padrões sem distorcer a interpretação.', 'Dados e entendimento', 'Visualizações transformam padrões abstratos em evidência compreensível para análise e comunicação.', 'Conjunto de gráficos com pergunta, escolha do tipo, leitura e limitações.', ARRAY['18/09','02/10']::text[], 8, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K09', 'Formular e validar hipóteses com base em dados', 'Converter suspeitas em hipóteses testáveis, definir evidência esperada e interpretar resultados.', 'Raciocínio analítico', 'Estrutura a investigação e reduz conclusões guiadas apenas por intuição.', 'Hipótese explícita, método de validação, resultado e decisão com ressalvas.', ARRAY['18/09']::text[], 9, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K10', 'Interpretar correlação e causalidade em análises', 'Distinguir associação de relação causal e reconhecer confundidores e conclusões indevidas.', 'Raciocínio analítico', 'Evita transformar padrões estatísticos em afirmações causais que os dados não sustentam.', 'Análise de um caso com correlação, possíveis confundidores e limites para inferência causal.', ARRAY['18/09']::text[], 10, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K11', 'Treinar modelos simples (ex.: sklearn)', 'Preparar dados, dividir conjuntos, treinar um baseline e obter previsões de forma reproduzível.', 'Modelagem', 'Cria a primeira referência mensurável antes de aumentar a complexidade da solução.', 'Notebook executável com split, baseline, treinamento, predição e avaliação inicial.', ARRAY['18/09']::text[], 11, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K12', 'Comparar e selecionar algoritmos de aprendizado', 'Comparar modelos usando métricas, custo, interpretabilidade, latência e requisitos do problema.', 'Modelagem', 'O melhor algoritmo depende do contexto e não apenas da maior pontuação em uma métrica.', 'Tabela comparativa de modelos com critérios técnicos e justificativa da escolha final.', ARRAY['18/09']::text[], 12, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K13', 'Definir métricas de avaliação adequadas ao problema', 'Selecionar métricas coerentes com erro, classe, impacto e objetivo do caso.', 'Avaliação e iteração', 'Uma métrica inadequada pode otimizar o comportamento errado mesmo quando o modelo parece bom.', 'Escolha justificada de métricas e interpretação de pelo menos duas alternativas.', ARRAY['25/09','02/10']::text[], 13, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K14', 'Detectar overfitting e underfitting', 'Reconhecer sinais de baixa capacidade ou baixa generalização usando treino, validação e curvas.', 'Avaliação e iteração', 'Ajuda a decidir se o próximo passo é mais dados, regularização, novas features ou outro modelo.', 'Diagnóstico com resultados de treino/validação e recomendação de ação corretiva.', ARRAY['25/09','02/10']::text[], 14, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K15', 'Aplicar ajuste básico de hiperparâmetros', 'Testar configurações do modelo de forma controlada, evitando otimização sobre o conjunto de teste.', 'Avaliação e iteração', 'Permite melhorar modelos com método e sem confundir ajuste com capacidade de generalização.', 'Busca simples documentada, comparação com baseline e avaliação em conjunto separado.', ARRAY['02/10']::text[], 15, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K16', 'Iterar modelos com base em resultados experimentais', 'Transformar resultados e erros em uma próxima hipótese de experimento, mantendo comparação rastreável.', 'Avaliação e iteração', 'Evita alterações aleatórias e cria um ciclo de melhoria baseado em evidências.', 'Registro de pelo menos duas iterações com hipótese, mudança, resultado e decisão.', ARRAY['25/09']::text[], 16, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K17', 'Identificar limitações técnicas e operacionais', 'Mapear restrições de dado, desempenho, custo, infraestrutura, segurança, operação e manutenção.', 'Engenharia e limites', 'Uma solução útil precisa funcionar no ambiente real, não somente no notebook.', 'Lista priorizada de limitações, impacto e estratégias de mitigação.', ARRAY['02/10']::text[], 17, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K18', 'Documentar resultados experimentais', 'Registrar contexto, dados, parâmetros, métricas, artefatos e conclusões para permitir reprodução.', 'Evidência e governança', 'Sem rastreabilidade, resultados ficam difíceis de comparar, reproduzir e revisar.', 'Experimento documentado com entradas, configuração, resultado, artefato e conclusão.', ARRAY['18/09','02/10']::text[], 18, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K19', 'Justificar decisões técnicas utilizando evidências', 'Conectar decisão a resultados observáveis, critérios e limitações em vez de preferência pessoal.', 'Evidência e governança', 'Decisões explicáveis são mais fáceis de revisar, defender e melhorar.', 'Decisão técnica acompanhada de evidência, alternativa considerada e trade-off explícito.', ARRAY['02/10']::text[], 19, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K20', 'Validar respostas geradas por IA', 'Checar factualidade, fonte, aderência ao contexto, consistência e risco antes de usar uma resposta gerada.', 'Evidência e governança', 'Modelos generativos podem produzir respostas convincentes sem garantia de correção.', 'Checklist aplicado a respostas de IA com identificação de falhas e correções fundamentadas.', ARRAY['02/10']::text[], 20, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K21', 'Avaliar impacto da solução nos objetivos do negócio', 'Relacionar resultado técnico a ganho, risco, custo, adoção e objetivo do problema original.', 'Evidência e governança', 'Uma solução tecnicamente correta pode não gerar valor se não mudar o indicador que importa.', 'Mapa de métricas técnicas versus métricas de impacto e recomendação de continuidade.', ARRAY['02/10']::text[], 21, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K22', 'Comunicar de forma técnica e não técnica', 'Adaptar explicação, profundidade, vocabulário e evidência ao público sem perder precisão.', 'Comunicação e evolução', 'Conhecimento só gera impacto quando diferentes públicos conseguem compreendê-lo e decidir.', 'Duas explicações do mesmo resultado: uma técnica e outra executiva/não técnica.', ARRAY['25/09','02/10']::text[], 22, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K23', 'Compartilhar conhecimento técnico com colegas', 'Transferir aprendizado de forma estruturada, com exemplo, contexto e material reutilizável.', 'Comunicação e evolução', 'Aumenta capacidade coletiva e reduz conhecimento concentrado em uma única pessoa.', 'Mini-aula, documentação ou demonstração utilizada por outra pessoa para executar a atividade.', ARRAY['18/09']::text[], 23, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K24', 'Dar e receber feedback construtivo', 'Oferecer feedback específico e acionável e transformar feedback recebido em melhoria observável.', 'Comunicação e evolução', 'A aprendizagem em grupo depende de ciclos seguros de revisão, ajuste e colaboração.', 'Registro de feedback dado/recebido, ação tomada e aprendizado resultante.', ARRAY['25/09']::text[], 24, true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K25', 'Identificar lacunas no próprio conhecimento e aplicá-lo em novos contextos', 'Reconhecer o que ainda não domina, planejar estudo e transferir aprendizado para um problema diferente.', 'Comunicação e evolução', 'É a competência que sustenta evolução contínua depois que o conteúdo inicial muda.', 'Autoavaliação baseada em evidências, plano de lacuna e aplicação em um novo contexto.', ARRAY['02/10']::text[], 25, true)
on conflict (program_id, code) do update set
  title = excluded.title,
  summary = excluded.summary,
  category = excluded.category,
  why_it_matters = excluded.why_it_matters,
  evidence_suggestion = excluded.evidence_suggestion,
  reflection_sources = excluded.reflection_sources,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();


with edge_seed(from_code, to_code, relation_type) as (
  values
  ('K01', 'K02', 'prerequisite_of'),
  ('K01', 'K03', 'prerequisite_of'),
  ('K02', 'K03', 'prerequisite_of'),
  ('K05', 'K04', 'prerequisite_of'),
  ('K06', 'K04', 'prerequisite_of'),
  ('K04', 'K07', 'prerequisite_of'),
  ('K06', 'K07', 'prerequisite_of'),
  ('K04', 'K08', 'prerequisite_of'),
  ('K04', 'K09', 'prerequisite_of'),
  ('K05', 'K09', 'prerequisite_of'),
  ('K05', 'K10', 'prerequisite_of'),
  ('K09', 'K10', 'prerequisite_of'),
  ('K03', 'K11', 'prerequisite_of'),
  ('K06', 'K11', 'prerequisite_of'),
  ('K11', 'K12', 'prerequisite_of'),
  ('K13', 'K12', 'prerequisite_of'),
  ('K03', 'K13', 'prerequisite_of'),
  ('K05', 'K13', 'prerequisite_of'),
  ('K11', 'K14', 'prerequisite_of'),
  ('K13', 'K14', 'prerequisite_of'),
  ('K11', 'K15', 'prerequisite_of'),
  ('K13', 'K15', 'prerequisite_of'),
  ('K14', 'K15', 'prerequisite_of'),
  ('K12', 'K16', 'prerequisite_of'),
  ('K14', 'K16', 'prerequisite_of'),
  ('K15', 'K16', 'prerequisite_of'),
  ('K11', 'K17', 'prerequisite_of'),
  ('K16', 'K17', 'prerequisite_of'),
  ('K04', 'K18', 'prerequisite_of'),
  ('K11', 'K18', 'prerequisite_of'),
  ('K18', 'K19', 'prerequisite_of'),
  ('K19', 'K20', 'prerequisite_of'),
  ('K01', 'K21', 'prerequisite_of'),
  ('K13', 'K21', 'prerequisite_of'),
  ('K19', 'K21', 'prerequisite_of'),
  ('K18', 'K22', 'prerequisite_of'),
  ('K19', 'K22', 'prerequisite_of'),
  ('K22', 'K23', 'prerequisite_of'),
  ('K22', 'K24', 'prerequisite_of'),
  ('K17', 'K25', 'prerequisite_of'),
  ('K24', 'K25', 'prerequisite_of')
)
insert into public.ae_study_competency_edges (
  program_id, from_competency_id, to_competency_id, relation_type
)
select
  p.id,
  c_from.id,
  c_to.id,
  e.relation_type
from edge_seed e
join public.ae_study_programs p on p.slug = 'residencia-ia'
join public.ae_study_competencies c_from on c_from.program_id = p.id and c_from.code = e.from_code
join public.ae_study_competencies c_to on c_to.program_id = p.id and c_to.code = e.to_code
on conflict (program_id, from_competency_id, to_competency_id, relation_type) do nothing;

comment on table public.ae_study_programs is
  'Programas/clientes do StudyAgent. Residência IA é o cliente fundador.';
comment on table public.ae_study_competencies is
  'Nós do Knowledge Graph de competências.';
comment on table public.ae_study_competency_edges is
  'Arestas do Knowledge Graph, inicialmente relações de pré-requisito.';

commit;
