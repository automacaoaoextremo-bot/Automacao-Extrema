# Passo a passo — Ajustes Cardápio e Caixa

## Arquivos alterados

- `src/app/bazar-sementinha/pedidos/pedidos-client.tsx`
- `src/app/bazar-sementinha/caixa/caixa-client.tsx`

## O que foi ajustado

1. Ao criar um pedido pelo **Cardápio**, a tela agora rola automaticamente para o cartão do **pedido criado**, deixando o contexto igual ao fluxo do Bazar.
2. Ao registrar um pagamento no **Caixa**, todos os detalhes de clientes são recolhidos novamente, inclusive o cliente pago.

## Como atualizar

1. Extraia o zip na raiz do projeto `automacao-extrema`, substituindo os arquivos existentes.
2. Rode os comandos:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

3. Se passar, faça commit e push:

```powershell
git add src/app/bazar-sementinha/pedidos/pedidos-client.tsx src/app/bazar-sementinha/caixa/caixa-client.tsx docs/PASSO_A_PASSO_AJUSTES_CARDAPIO_PAGAMENTO_BAZAR.md
git commit -m "Ajusta contexto do cardapio e recolhimento do caixa do Bazar"
git push
```

4. Após o deploy, teste:

- Criar pedido pelo Cardápio e confirmar se o cartão do pedido criado aparece automaticamente.
- Registrar pagamento no Caixa e confirmar se os detalhes dos clientes voltam a ficar recolhidos.
