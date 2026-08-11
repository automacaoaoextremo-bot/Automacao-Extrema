-- Sementinha em Harmonia — Despensa Viva v1
-- Gestão de alimentos, lotes/validade, composição de cesta, movimentações,
-- entregas FEFO e permissões de acesso.
--
-- Os lotes iniciais são DEMONSTRATIVOS e estão identificados com demo_data = true.
-- A composição da cesta básica segue o material fornecido pelo TUCXA/Sementinha:
-- Arroz 5 kg, Feijão 2 kg, Açúcar 2 kg, Farinha de trigo 1 kg,
-- Óleo 2 un., Macarrão 2 pct, Molho 2 pct, Sal 1 un. e Café 1 un.

create table if not exists public.oh_sementinha_access (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  person_id uuid not null references public.oh_people(id) on delete cascade,
  access_role text not null default 'consulta'
    check (access_role in ('gestor', 'consulta')),
  active boolean not null default true,
  granted_by uuid null references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, person_id)
);

create table if not exists public.oh_sementinha_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  package_size numeric(12,3) not null default 1 check (package_size > 0),
  package_unit text not null default 'unidade',
  package_label text not null,
  is_basket_item boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  notes text null,
  created_by uuid null references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.oh_sementinha_basket_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  active boolean not null default true,
  notes text null,
  created_by uuid null references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.oh_sementinha_basket_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.oh_sementinha_basket_templates(id) on delete cascade,
  item_id uuid not null references public.oh_sementinha_items(id) on delete cascade,
  quantity_required numeric(12,3) not null check (quantity_required > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, item_id)
);

create table if not exists public.oh_sementinha_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  item_id uuid not null references public.oh_sementinha_items(id) on delete cascade,
  batch_code text not null,
  quantity_initial numeric(12,3) not null check (quantity_initial >= 0),
  quantity_available numeric(12,3) not null check (quantity_available >= 0),
  received_at date not null default current_date,
  expires_at date null,
  source text null,
  notes text null,
  demo_data boolean not null default false,
  created_by uuid null references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, batch_code)
);

create index if not exists oh_sementinha_batches_fefo_idx
  on public.oh_sementinha_batches (organization_id, item_id, expires_at, received_at)
  where quantity_available > 0;

create table if not exists public.oh_sementinha_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  template_id uuid null references public.oh_sementinha_basket_templates(id) on delete set null,
  basket_count integer not null check (basket_count > 0),
  delivered_at date not null default current_date,
  destination text null,
  notes text null,
  demo_data boolean not null default false,
  created_by uuid null references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.oh_sementinha_delivery_items (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.oh_sementinha_deliveries(id) on delete cascade,
  item_id uuid not null references public.oh_sementinha_items(id) on delete restrict,
  batch_id uuid not null references public.oh_sementinha_batches(id) on delete restrict,
  quantity numeric(12,3) not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.oh_sementinha_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  item_id uuid not null references public.oh_sementinha_items(id) on delete restrict,
  batch_id uuid null references public.oh_sementinha_batches(id) on delete set null,
  movement_type text not null
    check (movement_type in ('entrada', 'saida_cesta', 'saida', 'ajuste', 'perda', 'vencimento')),
  quantity_delta numeric(12,3) not null,
  occurred_at timestamptz not null default now(),
  reference_key text null,
  notes text null,
  demo_data boolean not null default false,
  created_by uuid null references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists oh_sementinha_movements_reference_uq
  on public.oh_sementinha_movements (organization_id, reference_key)
  where reference_key is not null;

create index if not exists oh_sementinha_movements_history_idx
  on public.oh_sementinha_movements (organization_id, occurred_at desc);

alter table public.oh_sementinha_access enable row level security;
alter table public.oh_sementinha_items enable row level security;
alter table public.oh_sementinha_basket_templates enable row level security;
alter table public.oh_sementinha_basket_template_items enable row level security;
alter table public.oh_sementinha_batches enable row level security;
alter table public.oh_sementinha_deliveries enable row level security;
alter table public.oh_sementinha_delivery_items enable row level security;
alter table public.oh_sementinha_movements enable row level security;

-- Recebimento de um novo lote com criação atômica da movimentação de entrada.
create or replace function public.oh_sementinha_receive_stock(
  p_organization_id uuid,
  p_item_id uuid,
  p_batch_code text,
  p_quantity numeric,
  p_received_at date,
  p_expires_at date,
  p_source text,
  p_notes text,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'A quantidade recebida deve ser maior que zero.';
  end if;

  if not exists (
    select 1
    from public.oh_sementinha_items
    where id = p_item_id
      and organization_id = p_organization_id
      and active = true
  ) then
    raise exception 'Item não encontrado para a organização.';
  end if;

  insert into public.oh_sementinha_batches (
    organization_id,
    item_id,
    batch_code,
    quantity_initial,
    quantity_available,
    received_at,
    expires_at,
    source,
    notes,
    created_by
  )
  values (
    p_organization_id,
    p_item_id,
    coalesce(nullif(trim(p_batch_code), ''), 'L-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS')),
    p_quantity,
    p_quantity,
    coalesce(p_received_at, current_date),
    p_expires_at,
    nullif(trim(p_source), ''),
    nullif(trim(p_notes), ''),
    p_created_by
  )
  returning id into v_batch_id;

  insert into public.oh_sementinha_movements (
    organization_id,
    item_id,
    batch_id,
    movement_type,
    quantity_delta,
    occurred_at,
    reference_key,
    notes,
    created_by
  )
  values (
    p_organization_id,
    p_item_id,
    v_batch_id,
    'entrada',
    p_quantity,
    coalesce(p_received_at::timestamptz, now()),
    'batch-entry:' || v_batch_id::text,
    coalesce(nullif(trim(p_notes), ''), 'Entrada de lote'),
    p_created_by
  );

  return v_batch_id;
end;
$$;

-- Ajuste de saldo de um lote, preservando o histórico.
create or replace function public.oh_sementinha_adjust_batch(
  p_organization_id uuid,
  p_batch_id uuid,
  p_new_quantity numeric,
  p_notes text,
  p_created_by uuid
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
  v_current numeric;
  v_delta numeric;
begin
  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception 'A nova quantidade não pode ser negativa.';
  end if;

  select item_id, quantity_available
    into v_item_id, v_current
  from public.oh_sementinha_batches
  where id = p_batch_id
    and organization_id = p_organization_id
  for update;

  if v_item_id is null then
    raise exception 'Lote não encontrado.';
  end if;

  v_delta := p_new_quantity - v_current;

  update public.oh_sementinha_batches
  set quantity_available = p_new_quantity,
      updated_at = now()
  where id = p_batch_id;

  if v_delta <> 0 then
    insert into public.oh_sementinha_movements (
      organization_id,
      item_id,
      batch_id,
      movement_type,
      quantity_delta,
      occurred_at,
      notes,
      created_by
    )
    values (
      p_organization_id,
      v_item_id,
      p_batch_id,
      'ajuste',
      v_delta,
      now(),
      coalesce(nullif(trim(p_notes), ''), 'Ajuste manual de estoque'),
      p_created_by
    );
  end if;

  return p_new_quantity;
end;
$$;

-- Entrega de cestas usando FEFO (First Expire, First Out).
-- O banco reserva/baixa primeiro o lote com validade mais próxima.
create or replace function public.oh_sementinha_deliver_baskets(
  p_organization_id uuid,
  p_template_id uuid,
  p_basket_count integer,
  p_delivered_at date,
  p_destination text,
  p_notes text,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery_id uuid;
  v_template_item record;
  v_batch record;
  v_required numeric;
  v_remaining numeric;
  v_take numeric;
begin
  if p_basket_count is null or p_basket_count <= 0 then
    raise exception 'Informe ao menos uma cesta.';
  end if;

  if not exists (
    select 1
    from public.oh_sementinha_basket_templates
    where id = p_template_id
      and organization_id = p_organization_id
      and active = true
  ) then
    raise exception 'Composição de cesta não encontrada.';
  end if;

  -- Validação prévia de disponibilidade.
  for v_template_item in
    select bti.item_id, bti.quantity_required, i.name
    from public.oh_sementinha_basket_template_items bti
    join public.oh_sementinha_items i on i.id = bti.item_id
    where bti.template_id = p_template_id
    order by bti.sort_order, i.name
  loop
    v_required := v_template_item.quantity_required * p_basket_count;

    if coalesce((
      select sum(b.quantity_available)
      from public.oh_sementinha_batches b
      where b.organization_id = p_organization_id
        and b.item_id = v_template_item.item_id
        and b.quantity_available > 0
    ), 0) < v_required then
      raise exception 'Estoque insuficiente de % para % cesta(s).',
        v_template_item.name, p_basket_count;
    end if;
  end loop;

  insert into public.oh_sementinha_deliveries (
    organization_id,
    template_id,
    basket_count,
    delivered_at,
    destination,
    notes,
    created_by
  )
  values (
    p_organization_id,
    p_template_id,
    p_basket_count,
    coalesce(p_delivered_at, current_date),
    nullif(trim(p_destination), ''),
    nullif(trim(p_notes), ''),
    p_created_by
  )
  returning id into v_delivery_id;

  for v_template_item in
    select bti.item_id, bti.quantity_required
    from public.oh_sementinha_basket_template_items bti
    where bti.template_id = p_template_id
    order by bti.sort_order, bti.item_id
  loop
    v_remaining := v_template_item.quantity_required * p_basket_count;

    for v_batch in
      select id, quantity_available
      from public.oh_sementinha_batches
      where organization_id = p_organization_id
        and item_id = v_template_item.item_id
        and quantity_available > 0
      order by expires_at asc nulls last, received_at asc, created_at asc, id
      for update
    loop
      exit when v_remaining <= 0;

      v_take := least(v_remaining, v_batch.quantity_available);

      update public.oh_sementinha_batches
      set quantity_available = quantity_available - v_take,
          updated_at = now()
      where id = v_batch.id;

      insert into public.oh_sementinha_delivery_items (
        delivery_id,
        item_id,
        batch_id,
        quantity
      )
      values (
        v_delivery_id,
        v_template_item.item_id,
        v_batch.id,
        v_take
      );

      insert into public.oh_sementinha_movements (
        organization_id,
        item_id,
        batch_id,
        movement_type,
        quantity_delta,
        occurred_at,
        reference_key,
        notes,
        created_by
      )
      values (
        p_organization_id,
        v_template_item.item_id,
        v_batch.id,
        'saida_cesta',
        -v_take,
        coalesce(p_delivered_at::timestamptz, now()),
        'delivery:' || v_delivery_id::text || ':' || v_batch.id::text,
        coalesce(nullif(trim(p_notes), ''), 'Baixa automática por entrega de cesta'),
        p_created_by
      );

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      raise exception 'Não foi possível concluir a baixa FEFO da cesta.';
    end if;
  end loop;

  return v_delivery_id;
end;
$$;

-- As funções transacionais são chamadas apenas pelo backend com service role.
-- Evita execução direta pelo navegador.
revoke all on function public.oh_sementinha_receive_stock(
  uuid, uuid, text, numeric, date, date, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.oh_sementinha_receive_stock(
  uuid, uuid, text, numeric, date, date, text, text, uuid
) to service_role;

revoke all on function public.oh_sementinha_adjust_batch(
  uuid, uuid, numeric, text, uuid
) from public, anon, authenticated;
grant execute on function public.oh_sementinha_adjust_batch(
  uuid, uuid, numeric, text, uuid
) to service_role;

revoke all on function public.oh_sementinha_deliver_baskets(
  uuid, uuid, integer, date, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.oh_sementinha_deliver_baskets(
  uuid, uuid, integer, date, text, text, uuid
) to service_role;

-- Seed da cesta atual e dados DEMONSTRATIVOS de estoque.
do $$
declare
  v_org_id uuid;
  v_template_id uuid;
  v_item_id uuid;
  v_delivery_id uuid;
  v_batch_id uuid;
begin
  select id
  into v_org_id
  from public.oh_organizations
  where slug = 'tucxa'
  order by created_at asc
  limit 1;

  if v_org_id is null then
    select organization_id
    into v_org_id
    from public.oh_client_site_settings
    where public_slug = 'tucxa'
      and active = true
    order by updated_at desc
    limit 1;
  end if;

  if v_org_id is null then
    raise notice 'Organização TUCXA não encontrada. Estrutura criada sem seed do Sementinha.';
    return;
  end if;

  -- Gestores atuais do cliente ganham acesso inicial ao Sementinha.
  insert into public.oh_sementinha_access (
    organization_id, person_id, access_role, active
  )
  select
    v_org_id,
    m.person_id,
    'gestor',
    true
  from public.oh_memberships m
  where m.organization_id = v_org_id
    and m.active = true
    and (
      lower(coalesce(m.status, '')) = 'gestor_cliente'
      or coalesce(m.agenda_viva_profile ->> 'isClientAdmin', 'false') = 'true'
    )
  on conflict (organization_id, person_id)
  do update set
    access_role = 'gestor',
    active = true,
    updated_at = now();

  -- Itens da cesta básica atual.
  insert into public.oh_sementinha_items
    (organization_id, name, slug, package_size, package_unit, package_label, is_basket_item, active, sort_order, notes)
  values
    (v_org_id, 'Arroz', 'arroz-5kg', 5, 'kg', 'Pacote de 5 kg', true, true, 10, 'Item da cesta básica atual do Sementinha.'),
    (v_org_id, 'Feijão', 'feijao-2kg', 2, 'kg', 'Pacote de 2 kg', true, true, 20, 'Item da cesta básica atual do Sementinha.'),
    (v_org_id, 'Açúcar', 'acucar-2kg', 2, 'kg', 'Pacote de 2 kg', true, true, 30, 'Item da cesta básica atual do Sementinha.'),
    (v_org_id, 'Farinha de trigo', 'farinha-trigo-1kg', 1, 'kg', 'Pacote de 1 kg', true, true, 40, 'Item da cesta básica atual do Sementinha.'),
    (v_org_id, 'Óleo', 'oleo', 1, 'unidade', '1 unidade', true, true, 50, 'A cesta atual utiliza 2 unidades.'),
    (v_org_id, 'Macarrão', 'macarrao', 1, 'pct', '1 pacote', true, true, 60, 'A cesta atual utiliza 2 pacotes.'),
    (v_org_id, 'Molho', 'molho', 1, 'pct', '1 pacote', true, true, 70, 'A cesta atual utiliza 2 pacotes.'),
    (v_org_id, 'Sal', 'sal', 1, 'unidade', '1 unidade', true, true, 80, 'Item da cesta básica atual do Sementinha.'),
    (v_org_id, 'Café', 'cafe', 1, 'unidade', '1 unidade', true, true, 90, 'Item da cesta básica atual do Sementinha.')
  on conflict (organization_id, slug)
  do update set
    name = excluded.name,
    package_size = excluded.package_size,
    package_unit = excluded.package_unit,
    package_label = excluded.package_label,
    is_basket_item = true,
    active = true,
    sort_order = excluded.sort_order,
    notes = excluded.notes,
    updated_at = now();

  insert into public.oh_sementinha_basket_templates (
    organization_id, name, slug, active, notes
  )
  values (
    v_org_id,
    'Cesta Básica Sementinha',
    'cesta-basica-atual',
    true,
    'Composição atual informada pelo responsável do Sementinha em agosto/2026.'
  )
  on conflict (organization_id, slug)
  do update set
    name = excluded.name,
    active = true,
    notes = excluded.notes,
    updated_at = now()
  returning id into v_template_id;

  -- O RETURNING acima pode não retornar no caminho DO UPDATE em versões antigas;
  -- por segurança, seleciona explicitamente.
  select id into v_template_id
  from public.oh_sementinha_basket_templates
  where organization_id = v_org_id
    and slug = 'cesta-basica-atual';

  insert into public.oh_sementinha_basket_template_items
    (template_id, item_id, quantity_required, sort_order)
  select v_template_id, i.id,
    case i.slug
      when 'oleo' then 2
      when 'macarrao' then 2
      when 'molho' then 2
      else 1
    end,
    i.sort_order
  from public.oh_sementinha_items i
  where i.organization_id = v_org_id
    and i.slug in (
      'arroz-5kg', 'feijao-2kg', 'acucar-2kg', 'farinha-trigo-1kg',
      'oleo', 'macarrao', 'molho', 'sal', 'cafe'
    )
  on conflict (template_id, item_id)
  do update set
    quantity_required = excluded.quantity_required,
    sort_order = excluded.sort_order,
    updated_at = now();

  -- -----------------------------------------------------------------
  -- DADOS DEMONSTRATIVOS.
  -- Há uma entrega simulada de 2 cestas em 05/08/2026.
  -- O estoque atual remanescente foi montado para evidenciar FEFO:
  -- Arroz: 10 kg no lote mais próximo do vencimento + 40 kg em lote posterior.
  -- -----------------------------------------------------------------

  -- ARROZ: 4 pacotes iniciais no lote A; 2 usados na entrega demo; restam 2 = 10 kg.
  select id into v_item_id from public.oh_sementinha_items
    where organization_id = v_org_id and slug = 'arroz-5kg';
  insert into public.oh_sementinha_batches
    (organization_id, item_id, batch_code, quantity_initial, quantity_available, received_at, expires_at, source, notes, demo_data)
  values
    (v_org_id, v_item_id, 'DEMO-ARROZ-A', 4, 2, '2026-07-15', '2026-09-15', 'Doação simulada', 'DEMO: lote que deve sair primeiro. Restam 2 pacotes = 10 kg.', true),
    (v_org_id, v_item_id, 'DEMO-ARROZ-B', 8, 8, '2026-08-02', '2027-03-30', 'Doação simulada', 'DEMO: lote posterior. 8 pacotes = 40 kg.', true)
  on conflict (item_id, batch_code) do nothing;

  -- FEIJÃO
  select id into v_item_id from public.oh_sementinha_items
    where organization_id = v_org_id and slug = 'feijao-2kg';
  insert into public.oh_sementinha_batches
    (organization_id, item_id, batch_code, quantity_initial, quantity_available, received_at, expires_at, source, notes, demo_data)
  values
    (v_org_id, v_item_id, 'DEMO-FEIJAO-A', 6, 4, '2026-07-18', '2026-10-10', 'Doação simulada', 'DEMO: validade mais próxima.', true),
    (v_org_id, v_item_id, 'DEMO-FEIJAO-B', 12, 12, '2026-08-03', '2027-04-10', 'Doação simulada', 'DEMO: lote posterior.', true)
  on conflict (item_id, batch_code) do nothing;

  -- AÇÚCAR
  select id into v_item_id from public.oh_sementinha_items
    where organization_id = v_org_id and slug = 'acucar-2kg';
  insert into public.oh_sementinha_batches
    (organization_id, item_id, batch_code, quantity_initial, quantity_available, received_at, expires_at, source, notes, demo_data)
  values
    (v_org_id, v_item_id, 'DEMO-ACUCAR-A', 7, 5, '2026-07-18', '2026-11-15', 'Doação simulada', 'DEMO: validade mais próxima.', true),
    (v_org_id, v_item_id, 'DEMO-ACUCAR-B', 10, 10, '2026-08-03', '2027-05-15', 'Doação simulada', 'DEMO: lote posterior.', true)
  on conflict (item_id, batch_code) do nothing;

  -- FARINHA
  select id into v_item_id from public.oh_sementinha_items
    where organization_id = v_org_id and slug = 'farinha-trigo-1kg';
  insert into public.oh_sementinha_batches
    (organization_id, item_id, batch_code, quantity_initial, quantity_available, received_at, expires_at, source, notes, demo_data)
  values
    (v_org_id, v_item_id, 'DEMO-FARINHA-A', 7, 5, '2026-07-10', '2026-08-31', 'Doação simulada', 'DEMO: atenção — vencimento próximo.', true),
    (v_org_id, v_item_id, 'DEMO-FARINHA-B', 15, 15, '2026-08-01', '2027-02-28', 'Doação simulada', 'DEMO: lote posterior.', true)
  on conflict (item_id, batch_code) do nothing;

  -- ÓLEO
  select id into v_item_id from public.oh_sementinha_items
    where organization_id = v_org_id and slug = 'oleo';
  insert into public.oh_sementinha_batches
    (organization_id, item_id, batch_code, quantity_initial, quantity_available, received_at, expires_at, source, notes, demo_data)
  values
    (v_org_id, v_item_id, 'DEMO-OLEO-A', 12, 8, '2026-07-20', '2026-10-31', 'Doação simulada', 'DEMO: lote consumido primeiro.', true),
    (v_org_id, v_item_id, 'DEMO-OLEO-B', 20, 20, '2026-08-03', '2027-06-30', 'Doação simulada', 'DEMO: lote posterior.', true)
  on conflict (item_id, batch_code) do nothing;

  -- MACARRÃO
  select id into v_item_id from public.oh_sementinha_items
    where organization_id = v_org_id and slug = 'macarrao';
  insert into public.oh_sementinha_batches
    (organization_id, item_id, batch_code, quantity_initial, quantity_available, received_at, expires_at, source, notes, demo_data)
  values
    (v_org_id, v_item_id, 'DEMO-MACARRAO-A', 14, 10, '2026-07-20', '2026-09-30', 'Doação simulada', 'DEMO: validade mais próxima.', true),
    (v_org_id, v_item_id, 'DEMO-MACARRAO-B', 30, 30, '2026-08-03', '2027-03-31', 'Doação simulada', 'DEMO: lote posterior.', true)
  on conflict (item_id, batch_code) do nothing;

  -- MOLHO
  select id into v_item_id from public.oh_sementinha_items
    where organization_id = v_org_id and slug = 'molho';
  insert into public.oh_sementinha_batches
    (organization_id, item_id, batch_code, quantity_initial, quantity_available, received_at, expires_at, source, notes, demo_data)
  values
    (v_org_id, v_item_id, 'DEMO-MOLHO-A', 14, 10, '2026-07-12', '2026-08-25', 'Doação simulada', 'DEMO: prioridade máxima de saída por validade.', true),
    (v_org_id, v_item_id, 'DEMO-MOLHO-B', 30, 30, '2026-08-03', '2026-12-20', 'Doação simulada', 'DEMO: lote posterior.', true)
  on conflict (item_id, batch_code) do nothing;

  -- SAL
  select id into v_item_id from public.oh_sementinha_items
    where organization_id = v_org_id and slug = 'sal';
  insert into public.oh_sementinha_batches
    (organization_id, item_id, batch_code, quantity_initial, quantity_available, received_at, expires_at, source, notes, demo_data)
  values
    (v_org_id, v_item_id, 'DEMO-SAL-A', 17, 15, '2026-07-20', '2027-12-31', 'Doação simulada', 'DEMO.', true)
  on conflict (item_id, batch_code) do nothing;

  -- CAFÉ
  select id into v_item_id from public.oh_sementinha_items
    where organization_id = v_org_id and slug = 'cafe';
  insert into public.oh_sementinha_batches
    (organization_id, item_id, batch_code, quantity_initial, quantity_available, received_at, expires_at, source, notes, demo_data)
  values
    (v_org_id, v_item_id, 'DEMO-CAFE-A', 7, 5, '2026-07-20', '2026-09-20', 'Doação simulada', 'DEMO: validade mais próxima.', true),
    (v_org_id, v_item_id, 'DEMO-CAFE-B', 15, 15, '2026-08-03', '2027-01-31', 'Doação simulada', 'DEMO: lote posterior.', true)
  on conflict (item_id, batch_code) do nothing;

  -- Movimentações de entrada de todos os lotes DEMO.
  insert into public.oh_sementinha_movements (
    organization_id, item_id, batch_id, movement_type, quantity_delta,
    occurred_at, reference_key, notes, demo_data
  )
  select
    b.organization_id,
    b.item_id,
    b.id,
    'entrada',
    b.quantity_initial,
    b.received_at::timestamptz,
    'demo-entry:' || b.id::text,
    'DEMO: entrada inicial para demonstrar histórico por lote.',
    true
  from public.oh_sementinha_batches b
  where b.organization_id = v_org_id
    and b.demo_data = true
  on conflict (organization_id, reference_key) where reference_key is not null
  do nothing;

  -- Uma entrega DEMO de duas cestas, com baixa nos lotes que vencem primeiro.
  select id into v_delivery_id
  from public.oh_sementinha_deliveries
  where organization_id = v_org_id
    and demo_data = true
    and notes = 'DEMO-SEMENTINHA-ENTREGA-2-CESTAS'
  limit 1;

  if v_delivery_id is null then
    insert into public.oh_sementinha_deliveries (
      organization_id, template_id, basket_count, delivered_at,
      destination, notes, demo_data
    )
    values (
      v_org_id, v_template_id, 2, '2026-08-05',
      'Comunidade — demonstração',
      'DEMO-SEMENTINHA-ENTREGA-2-CESTAS',
      true
    )
    returning id into v_delivery_id;

    -- Os valores abaixo representam 2 cestas e já estão refletidos em quantity_available.
    -- Usa sempre o lote A/mais próximo do vencimento.
    insert into public.oh_sementinha_delivery_items (delivery_id, item_id, batch_id, quantity)
    select v_delivery_id, i.id, b.id,
      case i.slug
        when 'oleo' then 4
        when 'macarrao' then 4
        when 'molho' then 4
        else 2
      end
    from public.oh_sementinha_items i
    join public.oh_sementinha_batches b
      on b.item_id = i.id
     and b.organization_id = v_org_id
     and b.batch_code like 'DEMO-%-A'
    where i.organization_id = v_org_id
      and i.slug in (
        'arroz-5kg', 'feijao-2kg', 'acucar-2kg', 'farinha-trigo-1kg',
        'oleo', 'macarrao', 'molho', 'sal', 'cafe'
      );

    insert into public.oh_sementinha_movements (
      organization_id, item_id, batch_id, movement_type, quantity_delta,
      occurred_at, reference_key, notes, demo_data
    )
    select
      v_org_id,
      di.item_id,
      di.batch_id,
      'saida_cesta',
      -di.quantity,
      '2026-08-05 12:00:00-03'::timestamptz,
      'demo-delivery:' || v_delivery_id::text || ':' || di.batch_id::text,
      'DEMO: baixa de duas cestas para mostrar histórico e FEFO.',
      true
    from public.oh_sementinha_delivery_items di
    where di.delivery_id = v_delivery_id
    on conflict (organization_id, reference_key) where reference_key is not null
    do nothing;
  end if;
end;
$$;
