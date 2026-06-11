# Corrente em Dia — Pacote de implantação inicial

Este pacote cria a base da nova solução **Corrente em Dia** dentro da estrutura atual da Automação Extrema.

## Recomendação de arquitetura

Para a V1, a solução deve ficar **dentro do projeto atual `automacao-extrema`**, usando o mesmo repositório GitHub, o mesmo projeto Supabase e o mesmo projeto Vercel.

Não crie um projeto separado em `C:\Users\lacos\Documents\GitHub\corrente-em-dia` neste momento. Também não crie um segundo app dentro de `automacao-extrema\corrente-em-dia`. O melhor é usar rotas e módulos dentro do app atual:

- `src/app/solucoes/corrente-em-dia` — landing da solução.
- `src/app/c/[slug]` — página simples da entidade/cliente.
- `src/app/admin/ae/corrente-em-dia` — painel interno da AE para a V1.
- `src/app/api/admin/corrente-em-dia/*` — APIs administrativas da solução.
- `src/lib/corrente-em-dia.ts` — tipos e utilitários da solução.
- `supabase/sql/20260611_*` — SQLs da solução.

## Como instalar os arquivos no projeto

No PowerShell:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
powershell -ExecutionPolicy Bypass -File C:\CAMINHO\DO\PACOTE\instalar-corrente-em-dia.ps1 -ProjectRoot C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Depois rode:

```powershell
npm run lint
npm run build
```

## SQLs

Rode no Supabase SQL Editor, nesta ordem:

1. `supabase/sql/20260611_01_cadastro_solucao_corrente_em_dia.sql`
2. `supabase/sql/20260611_02_base_corrente_em_dia.sql`
3. `supabase/sql/20260611_03_seed_corrente_em_dia_dados_fakes.sql`

## Rotas para validar

- `/solucoes/corrente-em-dia`
- `/c/casa-pai-benedito-das-matas`
- `/c/tenda-cabocla-estrela-verde`
- `/admin/ae/corrente-em-dia`

## Observação

A V1 segue o alinhamento validado com Laércio: arrecadações, Pix, comprovantes, pré-validação, aprovação humana e painel simples. Split automático, gateway, Pix dinâmico, campanhas e contas a pagar/receber devem ficar para fases posteriores.
