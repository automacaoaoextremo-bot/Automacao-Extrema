
-- BINGO DO TUCXA 12/12/2026
-- Cadastro de propostas comerciais em RASCUNHO.
-- Requer V07C, usuario gestor TUCXA e evento sem vendas ativas.
-- Nao cria pedidos, pagamentos ou vouchers utilizaveis.

BEGIN;

DO $$
DECLARE
  v_event uuid;
  v_status text;
  v_sales_enabled boolean;
  v_actor uuid;
  v record;
  v_id uuid;
  v_novos integer := 0;
BEGIN
  IF to_regclass('public.bnc_v07c_combos') IS NULL THEN
    RAISE EXCEPTION 'Tabela de combos ausente. Conferir V07C.';
  END IF;

  SELECT e.id, e.status, e.sales_enabled
    INTO v_event, v_status, v_sales_enabled
  FROM public.bnc_events e
  JOIN public.bnc_organizations o
    ON o.id = e.organization_id
  WHERE o.slug = 'tucxa'
    AND e.slug = 'bingo-tucxa-2026-12-12'
  FOR UPDATE OF e;

  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Evento bingo-tucxa-2026-12-12 nao encontrado.';
  END IF;

  IF v_status NOT IN ('draft', 'ready') OR v_sales_enabled THEN
    RAISE EXCEPTION 'Evento nao apto a preparar ofertas.';
  END IF;

  -- Identifica um gestor real da organizacao TUCXA.
  SELECT u.id INTO v_actor
  FROM auth.users u
  JOIN public.bnc_members m
    ON m.user_id = u.id
  JOIN public.bnc_organizations o
    ON o.id = m.organization_id
  WHERE lower(u.email) = 'tucxacentro@gmail.com'
    AND o.slug = 'tucxa'
    AND m.role IN ('owner', 'manager')
  LIMIT 1;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Gestor tucxacentro@gmail.com nao cadastrado ou sem permissao.';
  END IF;

  FOR v IN
    SELECT * FROM (VALUES

      ('Cartela avulsa (proposta)',
       'cards', 700, 1, 0, 'food',
       'Validade por rodada e cor a definir.'),

      ('Combo 3 cartelas (proposta)',
       'cards', 2000, 3, 0, 'food',
       'Validade por rodada e cor a definir.'),

      ('Combo 5 cartelas (proposta)',
       'cards', 3000, 5, 0, 'food',
       'Validade por rodada e cor a definir.'),

      ('Passaporte 7 cartelas (proposta)',
       'cards', 4200, 7, 0, 'food',
       'Uso das cartelas por rodada a aprovar.'),

      ('Credito alimentacao R$ 30 (proposta)',
       'food', 3000, 0, 3000, 'food',
       'Controle de saldo ainda nao implementado.'),

      ('Combo 3 cartelas + R$ 20 alimentacao (proposta)',
       'mixed', 4000, 3, 2000, 'food',
       'Cartelas e credito sujeitos a regras de uso.'),

      ('Voucher flexivel R$ 100 (proposta)',
       'credit', 10000, 0, 10000, 'either',
       'Requer controle de saldo, resgate e conciliacao.')

    ) AS x(
      title,
      kind,
      price_cents,
      card_quantity,
      food_credit_cents,
      credit_scope,
      description
    )

  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.bnc_v07c_combos c
      WHERE c.event_id = v_event
        AND lower(btrim(c.title)) = lower(btrim(v.title))
    ) THEN

      INSERT INTO public.bnc_v07c_combos (
        event_id,
        title,
        kind,
        price_cents,
        card_quantity,
        food_credit_cents,
        credit_scope,
        description,
        created_by
      )
      VALUES (
        v_event,
        v.title,
        v.kind,
        v.price_cents,
        v.card_quantity,
        v.food_credit_cents,
        v.credit_scope,
        v.description,
        v_actor
      )
      RETURNING id INTO v_id;

      INSERT INTO public.bnc_operator_audit (
        event_id,
        actor_id,
        action,
        details
      )
      VALUES (
        v_event,
        v_actor,
        'combo_draft_seed',
        jsonb_build_object(
          'combo_id', v_id,
          'source', 'Bingo-07E'
        )
      );

      v_novos := v_novos + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Ofertas novas em rascunho: %', v_novos;
END $$;

COMMIT;

-- Conferencia final.
SELECT
  title,
  kind,
  price_cents / 100.0 AS preco_reais,
  card_quantity,
  food_credit_cents / 100.0 AS credito_reais,
  credit_scope,
  status
FROM public.bnc_v07c_combos
WHERE event_id = (
  SELECT e.id
  FROM public.bnc_events e
  JOIN public.bnc_organizations o
    ON o.id = e.organization_id
  WHERE o.slug = 'tucxa'
    AND e.slug = 'bingo-tucxa-2026-12-12'
)
ORDER BY title;
