# Passo a passo — Ajuste da edição de pedidos com cadastros ativos

## Arquivo atualizado

- `src/app/bazar-sementinha/caixa/caixa-client.tsx`

## O que foi ajustado

1. No modal **Editar pedido**, os campos de item, categoria e valor deixaram de ser digitáveis livremente.
2. Para itens do **Bazar**, o operador deve selecionar:
   - o **valor cadastrado ativo**;
   - a **categoria cadastrada ativa e visível**.
3. Para itens do **Cardápio**, o operador deve selecionar um **item ativo do cardápio**, agrupado por categoria.
4. A quantidade agora usa botões **+** e **−**, igual ao fluxo de criação de pedido.
5. O valor unitário passa a ser exibido conforme o cadastro selecionado, sem edição manual.
6. Ao trocar o valor do Bazar ou item do Cardápio, o nome, categoria, valor unitário e subtotal são recalculados.
7. A edição continua enviando para a API os itens completos com `kind`, `name`, `quantity`, `unitPrice`, `categoryPath` e `sourceId`.

## Como atualizar

Extraia o zip na raiz do projeto `automacao-extrema`, substituindo os arquivos existentes.

Depois rode:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

Se passar, faça commit e push:

```powershell
git add src/app/bazar-sementinha/caixa/caixa-client.tsx docs/PASSO_A_PASSO_AJUSTES_EDICAO_ITENS_CADASTRADOS_BAZAR.md
git commit -m "Ajusta edicao de pedidos com cadastros ativos do Bazar"
git push
```

## Teste recomendado

1. Acesse `/bazar-sementinha/caixa`.
2. Abra os detalhes de um cliente com pedido pendente.
3. Clique em **Editar**.
4. Confirme que:
   - item do Bazar usa seleção de valor cadastrado;
   - categoria usa seleção de categoria cadastrada;
   - item do Cardápio usa seleção do cardápio cadastrado;
   - quantidade usa **+** e **−**;
   - subtotal e total mudam corretamente.
5. Salve a edição e confira o pedido no Caixa.
