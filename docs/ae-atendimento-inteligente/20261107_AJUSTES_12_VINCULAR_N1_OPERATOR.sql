-- OPCIONAL: caso o usuario N1 ainda nao esteja autorizado na RMC.
-- Use um UUID existente em Supabase Authentication > Users.
-- Nao altera usuarios de outras empresas.
DO $ae_n1$
DECLARE
 v_n1_user uuid := '3636946f-d9ae-4e98-8ff2-52ea858b327c'; -- SUBSTITUIR UUID N1
 v_org uuid;
BEGIN
 IF v_n1_user = '3636946f-d9ae-4e98-8ff2-52ea858b327c'::uuid THEN
   RAISE EXCEPTION 'Informe o UUID real do operador N1.';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=v_n1_user) THEN
   RAISE EXCEPTION 'Usuario N1 inexistente no Auth.';
 END IF;
 SELECT id INTO v_org FROM public.ae_ai_organizations WHERE slug='reparos-rmc';
 IF v_org IS NULL THEN RAISE EXCEPTION 'RMC nao encontrada.'; END IF;
 -- Nao rebaixar OWNER para OPERATOR.
 INSERT INTO public.ae_ai_memberships(organization_id,user_id,role)
 VALUES(v_org,v_n1_user,'operator')
 ON CONFLICT(organization_id,user_id) DO UPDATE SET role=CASE
   WHEN ae_ai_memberships.role='owner' THEN 'owner' ELSE 'operator' END;
END
$ae_n1$;
