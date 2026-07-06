# Correção de lint e TypeScript — Bazar no Controle

## Arquivos atualizados

Copie estes arquivos para as mesmas pastas do projeto, substituindo os existentes:

- `src/app/bazar-sementinha/gestao/gestao-client.tsx`
- `src/app/api/bazar-sementinha/orders/route.ts`
- `src/lib/bazar-sementinha.ts`

## O que foi corrigido

### 1. `gestao-client.tsx`

O carregamento inicial foi ajustado para evitar o erro do ESLint/React Compiler:

> Calling setState synchronously within an effect can trigger cascading renders

Alterações principais:

- importado `useCallback`;
- `loadConfig`, `loadOrders` e `loadAll` foram encapsulados com `useCallback`;
- o carregamento inicial dentro do `useEffect` passou a ser disparado de forma assíncrona via `window.setTimeout(..., 0)`;
- o `useEffect` agora possui a dependência correta `[loadAll]`.

### 2. `orders/route.ts`

O array `validItems` agora está tipado explicitamente como `BazarItemInput[]`, corrigindo o erro:

> Type 'string' is not assignable to type '"bazar" | "menu"'

Também foi incluída a importação do tipo `BazarItemInput` a partir de `@/lib/bazar-sementinha`.

## Comandos para validar

Depois de copiar os arquivos, rode:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

Se passar, faça commit e push:

```powershell
git add src/app/bazar-sementinha/gestao/gestao-client.tsx src/app/api/bazar-sementinha/orders/route.ts src/lib/bazar-sementinha.ts docs/PASSO_A_PASSO_CORRECAO_LINT_TSC_BAZAR.md
git commit -m "Corrige lint e tipos dos pedidos do Bazar no Controle"
git push
```
