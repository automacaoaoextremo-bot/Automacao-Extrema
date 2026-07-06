# Ajustes - Pedidos, edição pós-criação e prestação de contas do Bazar

## Arquivos alterados

- `src/app/bazar-sementinha/pedidos/pedidos-client.tsx`
- `src/app/api/bazar-sementinha/orders/route.ts`
- `src/app/api/bazar-sementinha/report/route.ts`

## O que foi ajustado

1. Na tela de **Pedidos > Cardápio**, o placeholder da busca foi alterado para:

   `Buscar refrigerante, bolo salgado, bolo doce`

2. Na tela de **Pedidos**, após criar um pedido, foi incluído o botão **Editar pedido** no cartão do pedido criado.

3. A edição do pedido recém-criado usa os cadastros ativos:
   - para Bazar: valor cadastrado ativo e categoria cadastrada ativa/visível;
   - para Cardápio: item ativo do cardápio;
   - quantidade com botões `+` e `-`.

4. Para permitir a edição logo após a criação sem exigir login de gestão, a API `PATCH /api/bazar-sementinha/orders` agora aceita a edição pública somente quando o `attemptId` enviado for o mesmo usado na criação daquele pedido. A edição via Gestão continua funcionando por sessão normalmente.

5. Em **Prestação de Contas > 3. Itens vendidos por item**, os itens do Bazar agora são agrupados detalhando a categoria:

   `Item Bazar R$ 5,00 · Roupas > Infantil > Masculino`

   Quando não houver categoria, aparece:

   `Item Bazar R$ 5,00 · Sem categoria`

## Como atualizar

1. Extraia este zip na raiz do projeto `automacao-extrema`, substituindo os arquivos existentes.

2. Rode os testes locais:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

3. Se passar, faça commit e push:

```powershell
git add src/app/bazar-sementinha/pedidos/pedidos-client.tsx src/app/api/bazar-sementinha/orders/route.ts src/app/api/bazar-sementinha/report/route.ts docs/PASSO_A_PASSO_AJUSTES_PEDIDOS_PRESTACAO_BAZAR.md
git commit -m "Ajusta pedidos cardapio edicao e prestacao do Bazar"
git push
```

4. Depois do deploy, testar:
   - criar pedido pelo Cardápio;
   - confirmar se aparece o cartão do pedido criado;
   - clicar em **Editar pedido** e salvar uma alteração;
   - abrir Prestação de Contas e validar o agrupamento dos itens do Bazar por categoria.
