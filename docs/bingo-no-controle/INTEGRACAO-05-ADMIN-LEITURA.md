# Bingo no Controle — Integração 05 (homologação)

## Escopo

Painel administrativo **somente leitura** do Bingo TUCXA, com autenticação própria no Supabase de homologação e policies de SELECT isoladas por organização. Visualiza eventos, rodadas, sorteios não anulados e quantidades de premiações. Não exibe nomes, telefones, cartelas ou dados privados de ganhadores.

Não é uma migração do administrativo inteiro do Sementinha: cadastro, edição, sorteio, finance, pagamentos, reivindicações e ganhadores exigem APIs, validações e auditoria em fases posteriores.

## Fonte e estado de homologação

Query (12): `bnc_legacy_raw` com `source_project, source_table, source_id, payload, imported_at`. Query (13): `eventos_com_indicacao_de_teste = 0`. Auditorias anteriores: 2 organizações, 2 eventos, 26 rodadas, 1046 sorteios e 53 premiações. A regex de teste **não substitui** a verificação por IDs do evento original. Contagens de reivindicações/ganhadores ainda exigem consulta por `source_table`.

## Isolamento e autenticação

- `NEXT_PUBLIC_BNC_HOMOLOG_SUPABASE_URL=https://zbqcngvohidmwqkfwwvf.supabase.co`
- `NEXT_PUBLIC_BNC_HOMOLOG_SUPABASE_ANON_KEY`: somente **publishable / anon key** do projeto de homologação; **nunca** `service_role` ou senha do banco.
- Configure essas duas variáveis **somente no ambiente Preview** da branch. Para executar localmente, utilize `.env.local` (não commitar).
- O portal usa `storageKey=bnc-tucxa-homolog-v05`, sem reaproveitar token de outras soluções.
- Policy de leitura depende de `auth.uid()` e da linha em `public.bnc_members`. As operações de escrita continuam sem novas concessões.
- Não publique as variáveis da homologação no ambiente Production; não faça merge na main nesta etapa.

## Provisionar primeiro administrador

1. Dashboard Supabase **homologação** > Authentication > Users: criar ou convidar um usuário de testes de e-mail sob seu controle e confirmar o e-mail; NÃO reutilizar senha de produção.
2. Dashboard > SQL Editor: pesquisar organização e usuário, com consultas abaixo. Não compartilhe UUID/e-mail se contiver informação privada desnecessária.
3. Substituir placeholders antes de inserir membro. A inserção deve ser feita via SQL Editor com papel admin somente no banco de homologação:

```sql
SELECT id, slug, name FROM public.bnc_organizations ORDER BY slug;
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 10;
-- Execute APENAS depois de validar os dois UUIDs:
-- INSERT INTO public.bnc_members (organization_id, user_id, role)
-- VALUES ('UUID-DA-ORGANIZACAO-TUCXA', 'UUID-DO-USUARIO-TESTE', 'manager')
-- ON CONFLICT (organization_id,user_id) DO NOTHING;
```

4. Depois de aplicar V05 e publicar Preview, autenticar na rota `/solucoes/bingo-no-controle/cliente/tucxa/admin`. Verificar os eventos, 11 rodadas, 358 sorteios, 23 premiações. Verificar também que outro usuário não membro não acessa esses dados.

## Aplicar migration

Utilize SQL Editor do projeto de homologação para aplicar **somente** o conteúdo de `20261020120000_bnc_admin_readonly_v05.sql`, após conferência. Não rodar `supabase db push` no projeto de produção, pois pasta geral contém migrations de outras soluções. O arquivo não toca no histórico existente, apenas em RLS/GRANT.

## Testes de regressão

- Conta autorizada TUCXA visualiza somente TUCXA.
- Conta não autorizada recebe acesso negado.
- Conta só membro do Sementinha não recebe dados TUCXA.
- Pessoa não autenticada recebe formulário de login; acesso API às tabelas deve retornar nenhum dado.
- Não há botões de escrita, nem acesso à tabela bnc_legacy_raw.
- Rodar `npm run lint`, `npx tsc --noEmit`, `npm run build` e conferir deployment Preview.

## Riscos pendentes

Policies adicionadas podem coexistir com policies anteriormente criadas (Postgres RLS combina policies permissivas com OR): auditar outras policies no mesmo banco. Não expor eventuais dados privados em bnc_events.title/venue ou nos rótulos de prêmios. Não usar em produção enquanto não houver testes reais de autorização e revisão de segurança.
