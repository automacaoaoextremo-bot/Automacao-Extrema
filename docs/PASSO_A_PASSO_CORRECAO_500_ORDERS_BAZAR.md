# Correção do erro 500 em `/api/bazar-sementinha/orders`

## Causa provável

A rota de pedidos estava usando embed do Supabase/PostgREST assim:

```ts
.select("*, client:bazar_clients(*), items:bazar_order_items(*), payments:bazar_payments(*)")
```

O relacionamento com `bazar_payments` não existe como foreign key direta a partir de `bazar_orders`, porque a tabela de pagamentos guarda os pedidos em um array `order_ids uuid[]`. Com isso, o PostgREST pode retornar erro ao tentar resolver o relacionamento `payments:bazar_payments(*)`, gerando erro 500 ao:

- criar pedido, quando a API tentava devolver o pedido recém-criado com `readOrder`;
- carregar pedidos na Gestão.

## Arquivos alterados

Copie estes arquivos para a raiz do projeto, substituindo os existentes:

```txt
src/app/api/bazar-sementinha/orders/route.ts
src/app/api/bazar-sementinha/bootstrap/route.ts
```

## O que mudou

### `orders/route.ts`

- Removeu o embed automático de `client`, `items` e `payments`.
- Agora busca os pedidos em `bazar_orders`.
- Depois busca clientes, itens e pagamentos separadamente.
- Monta o retorno manualmente com:
  - `client`
  - `items`
  - `payments`
- Mantém:
  - prevenção por `attemptId`;
  - prevenção por pedido idêntico do mesmo cliente nos últimos 15 segundos;
  - ações de Gestão: listar, editar, cancelar/reabrir e excluir.

### `bootstrap/route.ts`

- Removeu o embed de `payments`.
- Adicionou checagem explícita de erros de cada consulta.
- Mantém o cálculo do valor pendente para gerar o Pix.

## Passo a passo de atualização

1. Extraia o zip na raiz do projeto `automacao-extrema`.
2. Confirme que os arquivos foram substituídos nos caminhos corretos.
3. Rode:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

4. Faça commit:

```powershell
git add src/app/api/bazar-sementinha/orders/route.ts src/app/api/bazar-sementinha/bootstrap/route.ts docs/PASSO_A_PASSO_CORRECAO_500_ORDERS_BAZAR.md
git commit -m "Corrige erro 500 na API de pedidos do Bazar"
git push
```

5. Na Vercel, faça novo deploy. Se houver comportamento estranho por cache, use **Redeploy** com **Clear build cache**.

## Teste recomendado

Depois do deploy:

1. Abra `/bazar-sementinha/pedidos`.
2. Crie um pedido simples do Bazar com um cliente novo.
3. Confirme que aparece `Pedido criado: ...`.
4. Abra `/bazar-sementinha/gestao`.
5. Entre na seção **Pedidos**.
6. Confirme se o pedido aparece e teste **Editar**, **Cancelar/Reabrir** e **Excluir**.
