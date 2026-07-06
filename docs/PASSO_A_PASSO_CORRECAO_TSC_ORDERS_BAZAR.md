# Correção TypeScript - Pedidos do Bazar no Controle

## Arquivo corrigido

- `src/app/api/bazar-sementinha/orders/route.ts`

## Problema

O TypeScript estava inferindo `kind` como `string` no `map`, mesmo a regra retornando apenas `"bazar"` ou `"menu"`.

## Correção

O retorno do `map` foi tipado explicitamente como `BazarItemInput` e o campo `kind` foi declarado como `BazarItemInput["kind"]`.

## Atualização

Copie o arquivo do zip para a raiz do projeto, substituindo o arquivo atual.

Depois rode:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

Se passar, faça commit:

```powershell
git add src/app/api/bazar-sementinha/orders/route.ts docs/PASSO_A_PASSO_CORRECAO_TSC_ORDERS_BAZAR.md
git commit -m "Corrige tipo dos itens nos pedidos do Bazar"
git push
```
