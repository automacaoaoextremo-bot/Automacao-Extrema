# Passo a passo — Ajustes de Caixa e Edição de Pedidos do Bazar no Controle

## Arquivos alterados

- `src/app/bazar-sementinha/caixa/caixa-client.tsx`
- `src/app/api/bazar-sementinha/orders/route.ts`

## O que foi ajustado

1. Na tela do Caixa, o botão **Atualizar** do topo foi removido.
2. Os botões **Selecionar/Deselecionar** e **Ir para pagamento** foram movidos para dentro de **Ver detalhes** de cada cliente.
3. O botão **Selecionar/Deselecionar** só aparece quando o cliente possui pedidos pendentes.
4. O botão **Ir para pagamento** só fica disponível quando há pelo menos um pedido pendente selecionado daquele cliente.
5. A regra de pagamento com pedidos de um único cliente por vez foi mantida.
6. A edição de pedido foi ampliada. Agora é possível alterar:
   - cliente;
   - WhatsApp;
   - observações;
   - tipo do item: Bazar ou Cardápio;
   - nome do item;
   - categoria;
   - quantidade;
   - valor unitário;
   - remover itens;
   - adicionar itens.
7. Ao salvar a edição, a API recalcula o total do pedido e substitui os itens antigos pelos itens editados.
8. Pedido pago continua bloqueado para edição ou cancelamento.

## Como atualizar

Extraia este zip na raiz do projeto `automacao-extrema`, substituindo os arquivos existentes.

Depois rode:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

Se passar, faça o commit:

```powershell
git add src/app/bazar-sementinha/caixa/caixa-client.tsx src/app/api/bazar-sementinha/orders/route.ts docs/PASSO_A_PASSO_AJUSTES_CAIXA_EDICAO_BAZAR.md
git commit -m "Ajusta caixa e edicao completa de pedidos do Bazar"
git push
```

## Testes recomendados

1. Abrir `/bazar-sementinha/caixa`.
2. Confirmar que o botão **Atualizar** não aparece mais.
3. Abrir **Ver detalhes** de um cliente com pedidos pendentes.
4. Confirmar que os botões **Selecionar** e **Ir para pagamento** aparecem dentro dos detalhes.
5. Selecionar pedido pendente e registrar pagamento.
6. Editar pedido pendente e alterar item, categoria, quantidade e valor.
7. Confirmar que o total recalcula corretamente no Caixa.
8. Confirmar que pedido pago não permite edição nem cancelamento.
