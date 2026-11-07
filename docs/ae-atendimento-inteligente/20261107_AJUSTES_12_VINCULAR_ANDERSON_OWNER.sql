-- AJUSTES 12 / VINCULAR ANDERSON N2
-- Execute SOMENTE quando a conta Auth do Anderson JA existir e o WhatsApp
-- tiver sido confirmado com o titular. Nao registra senha.
-- Ajuste o valor abaixo para o numero REAL +55 DDD numero, sem sinais.
-- A conta deve ter phone_confirmed_at preenchido.
DO $ae12$
DECLARE
  v_phone text := '55DDDNUMERO'; -- SUBSTITUIR. Ex.: 5519999999999
  v_name text := 'NOME COMPLETO DO ANDERSON'; -- SUBSTITUIR
  v_org uuid;
  v_user uuid;
  v_count integer;
  v_registered_name text;
BEGIN
  IF v_phone !~ '^55[1-9][0-9]{9,10}$' THEN
    RAISE EXCEPTION 'Preencha WhatsApp com 55 + DDD + numero, somente digitos.';
  END IF;
  IF length(btrim(v_name)) < 5 OR v_name = 'NOME COMPLETO DO ANDERSON' THEN
    RAISE EXCEPTION 'Informe o nome completo do Anderson.';
  END IF;
  SELECT id INTO v_org FROM public.ae_ai_organizations WHERE slug = 'reparos-rmc';
  IF v_org IS NULL THEN RAISE EXCEPTION 'RMC nao encontrada.'; END IF;
  SELECT count(*)::integer, min(id) INTO v_count, v_user
    FROM auth.users
    WHERE regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g') = v_phone
      AND phone_confirmed_at IS NOT NULL;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Exige exatamente um usuario Auth com esse celular CONFIRMADO. Encontrados: %', v_count;
  END IF;
  SELECT coalesce(raw_user_meta_data->>'full_name','') INTO v_registered_name
  FROM auth.users WHERE id = v_user;
  IF length(btrim(v_registered_name)) > 0 AND
      lower(btrim(v_registered_name)) <> lower(btrim(v_name)) THEN
    RAISE EXCEPTION 'Nome do Auth nao coincide com o nome informado. Confira a identidade.';
  END IF;
  INSERT INTO public.ae_ai_memberships(organization_id,user_id,role)
  VALUES (v_org,v_user,'owner')
  ON CONFLICT (organization_id,user_id) DO UPDATE SET role='owner';
  RAISE NOTICE 'Conta vinculada como OWNER da RMC. Confirme login e permissoes.';
END
$ae12$;

-- Verificacao SEM expor o numero ao resultado:
SELECT o.slug, m.role, m.user_id, m.created_at
FROM public.ae_ai_memberships m
JOIN public.ae_ai_organizations o ON o.id=m.organization_id
WHERE o.slug='reparos-rmc' AND m.role='owner';
