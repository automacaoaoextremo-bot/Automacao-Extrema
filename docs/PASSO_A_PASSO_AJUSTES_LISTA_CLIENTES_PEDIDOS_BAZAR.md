# Ajustes - Lista de clientes e textos da tela de Pedidos

## Arquivos alterados

- `src/app/bazar-sementinha/pedidos/pedidos-client.tsx`
- `src/app/api/bazar-sementinha/bootstrap/route.ts`

## O que foi ajustado

1. O card **Lista de clientes** foi movido para o final da tela de Pedidos, depois de **Catálogo do Bazar** ou **Cardápio**.

2. O texto inicial foi alterado para:
   > Escolha primeiro o tipo do pedido: itens do bazar ou alimentos e bebidas.

3. O texto do **Catálogo do Bazar** foi alterado para:
   > Caso orientado pela coordenação, selecione a categoria do item e ao clicar no valor, é adicionado ao resumo. Ao finalizar os itens a serem incluidos no pedido, clicar em Criar pedido.

4. A lista de clientes da tela de Pedidos agora é montada a partir dos pedidos existentes e não excluídos do evento.
   - Clientes que ficaram órfãos após exclusão dos pedidos de teste deixam de aparecer nessa lista.
   - Clientes voltam a aparecer quando tiverem pedido ativo/não excluído.

## Como atualizar

1. Extraia este zip na raiz do projeto `automacao-extrema`, substituindo os arquivos existentes.

2. Rode os comandos de validação:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

3. Faça commit e push:

```powershell
git add src/app/bazar-sementinha/pedidos/pedidos-client.tsx src/app/api/bazar-sementinha/bootstrap/route.ts docs/PASSO_A_PASSO_AJUSTES_LISTA_CLIENTES_PEDIDOS_BAZAR.md
git commit -m "Ajusta lista de clientes e textos dos pedidos do Bazar"
git push
```

4. Após o deploy, abra `/bazar-sementinha/pedidos` e confirme:
   - o card de clientes aparece no final;
   - os textos foram atualizados;
   - clientes sem pedidos ativos não aparecem mais na lista.
