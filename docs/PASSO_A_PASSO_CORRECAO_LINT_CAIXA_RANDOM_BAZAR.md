# Correção de lint no Caixa do Bazar

## Arquivo atualizado

- `src/app/bazar-sementinha/caixa/caixa-client.tsx`

## Problema corrigido

O lint apontava erro porque `Math.random()` estava sendo chamado dentro do componente, na criação de IDs temporários para itens editáveis do pedido.

Erro original:

```txt
Cannot call impure function during render
Math.random is an impure function
```

## Correção aplicada

- Removido o uso de `Math.random()`.
- Adicionado `useRef` para manter um contador local de itens editáveis.
- Novos itens temporários passam a usar IDs previsíveis no formato `novo-1`, `novo-2`, etc.
- A função `makeEditableItem` foi ajustada para receber sempre um `OrderItem` existente, usando o próprio `id` vindo do banco.

## Passo a passo para atualizar

1. Extraia o zip na raiz do projeto `automacao-extrema`.
2. Substitua o arquivo existente.
3. Rode os comandos:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

4. Se passar, faça commit e push:

```powershell
git add src/app/bazar-sementinha/caixa/caixa-client.tsx docs/PASSO_A_PASSO_CORRECAO_LINT_CAIXA_RANDOM_BAZAR.md
git commit -m "Corrige lint do editor de pedidos no caixa do Bazar"
git push
```
