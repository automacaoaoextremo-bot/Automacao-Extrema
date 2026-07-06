# Passo a passo — Ajustes de Pedidos e Caixa do Bazar no Controle

## Arquivos alterados

- `src/app/bazar-sementinha/pedidos/pedidos-client.tsx`
- `src/app/api/bazar-sementinha/bootstrap/route.ts`

## O que foi corrigido

1. O Caixa agora recebe os pedidos já enriquecidos com `client` e `items`, evitando aparecer "Sem cliente" quando o pedido possui `client_id`.
2. A tela de Pedidos passou a carregar e exibir uma lista de clientes em ordem alfabética, com busca e botão `Fazer pedido`.
3. O termo usado na tela é `Cliente`, não `Responsável`.
4. Após criar um pedido, a tela exibe um cartão de confirmação no padrão operacional da Festa Junina do Tucxa:
   - etiqueta `Pedido criado`;
   - código do pedido;
   - nome do cliente;
   - data/hora;
   - itens;
   - total.
5. Foram incluídas as ações:
   - `Novo pedido`;
   - `Fazer outro pedido para este cliente`.
6. Os textos marcados na referência da Festa Junina, como garçom e fechamento, não foram adicionados ao Bazar.

## Como atualizar

1. Extraia o zip na raiz do projeto `automacao-extrema`.
2. Substitua os arquivos existentes quando solicitado.
3. Rode os comandos abaixo:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

4. Se tudo passar, faça commit e push:

```powershell
git add src/app/bazar-sementinha/pedidos/pedidos-client.tsx src/app/api/bazar-sementinha/bootstrap/route.ts docs/PASSO_A_PASSO_AJUSTES_PEDIDOS_CAIXA_BAZAR.md
git commit -m "Ajusta clientes nos pedidos e caixa do Bazar"
git push
```

5. Após o deploy, teste:
   - criar um pedido para um cliente;
   - conferir se o nome aparece na tela de confirmação;
   - abrir o Caixa e conferir se o pedido aparece agrupado pelo cliente;
   - criar outro pedido para o mesmo cliente usando o botão correspondente.
