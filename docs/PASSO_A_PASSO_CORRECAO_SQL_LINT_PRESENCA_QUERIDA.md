# Correção — Presença Querida

## Arquivos corrigidos

1. `supabase/sql/20260620_07_presenca_querida_cliente_fundador.sql`
2. `src/app/solucoes/presenca-querida/confirmar/[token]/page.tsx`

## O que foi corrigido

### SQL

A tabela `ae_solutions` da base atual usa estes campos:

- `short_description`
- `target_audience`
- `main_pains`
- `current_status`
- `priority`
- `source_file`

A versão anterior tentava gravar em campos inexistentes:

- `description`
- `target_public`
- `pain_summary`
- `status`
- `sort_order`
- `source_reference`

Também foi ajustado o `client_type` do cliente demo de `evento_aniversario` para `pessoa_fisica`, pois a tabela `ae_clients` possui restrição de valores permitidos.

## Como aplicar

1. Copie o arquivo SQL corrigido para:

```txt
supabase/sql/20260620_07_presenca_querida_cliente_fundador.sql
```

2. Copie o arquivo `page.tsx` corrigido para:

```txt
src/app/solucoes/presenca-querida/confirmar/[token]/page.tsx
```

3. Rode novamente o SQL no Supabase SQL Editor.

4. Rode localmente:

```bash
npm run lint
npm run build
```

## Observação

O `npm run build` já havia passado antes. A alteração no `page.tsx` remove o `setState` síncrono dentro do `useEffect`, que era o ponto bloqueado pelo `npm run lint`.
