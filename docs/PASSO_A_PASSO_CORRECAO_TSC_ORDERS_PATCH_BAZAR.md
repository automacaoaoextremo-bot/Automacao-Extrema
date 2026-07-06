# Correção TypeScript - orders/route.ts

## Problema corrigido

O comando:

```powershell
npx --no-install tsc --noEmit
```

apontava erro em `src/app/api/bazar-sementinha/orders/route.ts` porque, dentro do `PATCH`, o `body` vindo de `await request.json()` estava sem tipo explícito. Com isso, o TypeScript inferia os itens do `map` e do `filter` como `any`.

Erros corrigidos:

```txt
Parameter 'item' implicitly has an 'any' type.
```

## Arquivo alterado

```txt
src/app/api/bazar-sementinha/orders/route.ts
```

## O que foi ajustado

Foi criado um tipo explícito para o corpo do PATCH:

```ts
type BazarOrderPatchBody = {
  id?: string;
  status?: OrderStatus | string;
  payment_status?: PaymentStatus | string;
  clientName?: string;
  whatsapp?: string | null;
  notes?: string | null;
  items?: Partial<BazarItemInput>[];
  [key: string]: unknown;
};
```

E o trecho de edição dos itens foi tipado explicitamente:

```ts
const body = (await request.json()) as BazarOrderPatchBody;
const items: Partial<BazarItemInput>[] = Array.isArray(body.items) ? body.items : [];
```

Além disso, o `map` e o `filter` receberam tipagem explícita para evitar `implicit any`.

## Passo a passo para atualização

1. Extraia este zip na raiz do projeto `automacao-extrema`.
2. Substitua o arquivo existente.
3. Rode os comandos:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

4. Se passar, faça commit e push:

```powershell
git add src/app/api/bazar-sementinha/orders/route.ts docs/PASSO_A_PASSO_CORRECAO_TSC_ORDERS_PATCH_BAZAR.md
git commit -m "Corrige tipagem do PATCH de pedidos do Bazar"
git push
```
