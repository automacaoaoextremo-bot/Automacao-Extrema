-- Organização em Harmonia — conteúdo público editável do Tucxa
-- Seguro para rodar mais de uma vez no Supabase SQL Editor.

create table if not exists public.oh_client_public_content (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  content_type text not null,
  content jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_oh_client_public_content_unique_active
  on public.oh_client_public_content (organization_id, content_type)
  where active is true;

create index if not exists idx_oh_client_public_content_type_updated
  on public.oh_client_public_content (content_type, updated_at desc);

insert into public.oh_client_public_content (organization_id, content_type, content)
select
  org.id,
  'tucxa-publico-regulamento',
  jsonb_build_object(
    'newHereIntro', 'Este espaço resume as orientações mais importantes para quem ainda não conhece a casa. A ideia é evitar desencontros e ajudar você a chegar com mais tranquilidade, sabendo qual caminho seguir.',
    'atendimentoEmHarmonia', jsonb_build_object(
      'title', 'Atendimento em Harmonia',
      'shortLabel', 'Atendimento em Harmonia',
      'description', 'Consulte orientações, entre com seu cadastro validado e solicite agendamento, alteração ou cancelamento de atendimento conforme calendário da casa.',
      'callToAction', 'Entrar no Atendimento em Harmonia'
    ),
    'correnteEmDia', jsonb_build_object(
      'title', 'Corrente em Dia',
      'shortLabel', 'Corrente em Dia',
      'description', 'Escolha uma contribuição identificada ou anônima, defina o valor e a forma de pagamento, com mais clareza para a casa e menos retrabalho para a tesouraria.',
      'callToAction', 'Acessar Corrente em Dia'
    ),
    'consulenteServices', jsonb_build_array(
      jsonb_build_object(
        'title', 'Atendimento espiritual com acolhimento',
        'description', 'Nas segundas e terças, o Tucxa recebe Filhos de Fora que buscam auxílio, crescimento espiritual e orientação, sempre com respeito, ordem e cuidado.'
      ),
      jsonb_build_object(
        'title', 'Transformação e encaminhamentos',
        'description', 'Quando há orientação espiritual, alguns casos podem ser encaminhados para trabalhos específicos às quartas, com preparo e agendamento orientado pela coordenação.'
      ),
      jsonb_build_object(
        'title', 'Biblioteca e estudo',
        'description', 'A casa também estimula estudo, responsabilidade e crescimento, mantendo uma biblioteca aberta aos Filhos de Fora e Filhos da Corrente.'
      )
    ),
    'consulenteGuidelines', jsonb_build_array(
      jsonb_build_object(
        'title', 'A casa é aberta a quem busca auxílio',
        'description', 'O Tucxa é uma sociedade civil religiosa sem fins lucrativos, voltada à prática da fé, do amor e da ajuda ao próximo. O atendimento existe para acolher quem busca orientação e crescimento espiritual.'
      ),
      jsonb_build_object(
        'title', 'Atendimentos de segunda, terça e/ou quarta',
        'description', 'Segunda e terça: atendimento aos Filhos de Fora das 18h às 22h, com abertura às 18h30, fechamento da porta às 19h20 e reabertura às 20h. Quarta: trabalhos de Transformação das 18h30 às 22h, com abertura às 18h45 e fechamento da porta às 19h, sem reabertura, quando houver encaminhamento e agendamento pela coordenação.'
      ),
      jsonb_build_object(
        'title', 'Senha, ficha e orientação individual',
        'description', 'Ao chegar, cada consulente segue a orientação da recepção. A organização pode usar senhas e fichas individuais para preservar a ordem, a segurança e o cuidado no atendimento.'
      ),
      jsonb_build_object(
        'title', 'Respeito, silêncio e cuidado com o ambiente',
        'description', 'O silêncio e a disciplina ajudam a manter a harmonia dos trabalhos. A tecnologia deve apenas facilitar a orientação, sem substituir o acolhimento humano da casa.'
      )
    )
  )
from public.oh_organizations org
where org.slug = 'tucxa' or org.name ilike '%tucxa%'
on conflict (organization_id, content_type) where active is true do update set
  content = public.oh_client_public_content.content || excluded.content,
  updated_at = now();
