
-- BINGO DO TUCXA 12/12/2026
-- Importa 10 itens do cardapio do Bazar Sementinha.
-- Precos de referencia: confirmar com a Diretoria.
-- Nao altera o Bazar e nao ativa vendas.

BEGIN;

DO $$
DECLARE
  v_event uuid;
  v_status text;
  v_sales_enabled boolean;
  v record;
  v_novos integer := 0;
BEGIN
  IF to_regclass('public.bnc_menu_items') IS NULL THEN
    RAISE EXCEPTION 'Tabela bnc_menu_items ausente. Conferir V07B.';
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
    RAISE EXCEPTION 'Evento nao apto para preparar cardapio.';
  END IF;

  FOR v IN
    SELECT * FROM (VALUES
      ('Tortas', 'Torta salgada',
       'Torta salgada. Unidade: pedaco.', 1000, 10),

      ('Salgados', 'Salgados Assado/Frito',
       'Salgados assados ou fritos. Unidade.', 1000, 20),

      ('Doces', 'Pudim',
       'Pudim. Unidade: pedaco.', 1000, 30),

      ('Doces', 'Bolo',
       'Bolo. Unidade: pedaco.', 1200, 40),

      ('Doces', 'Morango com chocolate no palito',
       'Unidade.', 1200, 50),

      ('Doces', 'Pudim Promo',
       'Preco promocional de referencia. Pedaco.', 500, 60),

      ('Salgados', 'Salgado Promo',
       'Preco promocional de referencia. Pedaco.', 500, 70),

      ('Bebidas', 'Refrigerante',
       'Unidade.', 700, 80),

      ('Bebidas', 'Suco',
       'Copo.', 600, 90),

      ('Bebidas', 'Água com e sem gás',
       'Agua com ou sem gas. Unidade.', 500, 100)

    ) AS x(category,title,description,price_cents,sort_order)

  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.bnc_menu_items m
      WHERE m.event_id = v_event
        AND lower(btrim(m.category)) = lower(btrim(v.category))
        AND lower(btrim(m.title)) = lower(btrim(v.title))
    ) THEN
      INSERT INTO public.bnc_menu_items (
        event_id,
        category,
        title,
        description,
        price_cents,
        is_active,
        sort_order
      )
      VALUES (
        v_event,
        v.category,
        v.title,
        v.description,
        v.price_cents,
        true,
        v.sort_order
      );

      v_novos := v_novos + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Itens novos cadastrados: %', v_novos;
END $$;

COMMIT;

-- Conferencia final.
SELECT
  category,
  title,
  price_cents / 100.0 AS preco_reais,
  is_active,
  image_url
FROM public.bnc_menu_items
WHERE event_id = (
  SELECT e.id
  FROM public.bnc_events e
  JOIN public.bnc_organizations o
    ON o.id = e.organization_id
  WHERE o.slug = 'tucxa'
    AND e.slug = 'bingo-tucxa-2026-12-12'
)
ORDER BY category, title;
