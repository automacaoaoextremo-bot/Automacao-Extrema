# Ajustes — Carrinho misto e edição do pedido criado

## Arquivo alterado

- `src/app/bazar-sementinha/pedidos/pedidos-client.tsx`

## O que foi ajustado

1. O botão **Editar pedido** foi movido para dentro do quadro **Pedido criado**.
2. Ao alternar entre **Bazar** e **Cardápio**, o carrinho não é mais zerado nem filtrado por tipo.
3. Com isso, o mesmo pedido pode conter itens do Bazar e itens do Cardápio.
4. O carrinho continua sendo limpo somente depois que o pedido é criado com sucesso ou quando o usuário escolhe iniciar um novo pedido.

## Como atualizar

Extraia este zip na raiz do projeto `automacao-extrema`, substituindo o arquivo existente.

Depois rode:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

Se passar, faça o commit:

```powershell
git add src/app/bazar-sementinha/pedidos/pedidos-client.tsx docs/PASSO_A_PASSO_AJUSTES_CARRINHO_MISTO_BAZAR.md
git commit -m "Ajusta carrinho misto e botao editar pedido do Bazar"
git push
```

## Testes recomendados

1. Abra `/bazar-sementinha/pedidos`.
2. Adicione um item do **Bazar** ao carrinho.
3. Clique em **Cardápio**.
4. Confirme que o item do Bazar continua no carrinho.
5. Adicione um item do Cardápio.
6. Crie o pedido.
7. Confirme que o cartão **Pedido criado** mostra os itens dos dois tipos.
8. Confirme que o botão **Editar pedido** aparece dentro do quadro **Pedido criado**.
