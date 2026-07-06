# Passo a passo - Ajustes de carrinho, categorias e clientes do Bazar no Controle

## Arquivos alterados

- `src/app/bazar-sementinha/pedidos/pedidos-client.tsx`

## O que foi ajustado

1. O resumo/carrinho agora pode ser clicado para abrir uma janela de conferência antes de criar o pedido.
2. A janela de conferência permite aumentar quantidade, diminuir quantidade ou remover itens.
3. A categoria selecionada no Catálogo do Bazar agora aparece no cartão de pedido criado, abaixo do item.
4. O texto da Lista de clientes foi ajustado de “ou toque” para “e toque”.
5. Ao clicar em “Fazer pedido” ao lado de um cliente, o sistema preenche os dados do cliente, muda o contexto para Bazar e leva a tela para o card Catálogo do Bazar.
6. Depois de criar o pedido, os campos preenchidos são limpos: cliente, WhatsApp, categoria, busca e carrinho. O cartão do pedido criado continua exibindo os dados do pedido recém-gerado.

## Como atualizar

1. Extraia este zip na raiz do projeto `automacao-extrema`.
2. Substitua os arquivos existentes quando o Windows perguntar.
3. Rode os comandos abaixo:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

4. Se tudo passar, faça commit e push:

```powershell
git add src/app/bazar-sementinha/pedidos/pedidos-client.tsx docs/PASSO_A_PASSO_AJUSTES_CARRINHO_CATEGORIA_CLIENTES_BAZAR.md
git commit -m "Ajusta carrinho categorias e clientes dos pedidos do Bazar"
git push
```

5. Após o deploy, teste:

- adicionar itens do Bazar com categoria;
- clicar no Resumo para revisar/editar/remover itens;
- criar pedido;
- conferir se a categoria aparece no pedido criado;
- conferir se os campos foram limpos;
- clicar em “Fazer pedido” na Lista de clientes e verificar se a tela volta para o Catálogo do Bazar.
