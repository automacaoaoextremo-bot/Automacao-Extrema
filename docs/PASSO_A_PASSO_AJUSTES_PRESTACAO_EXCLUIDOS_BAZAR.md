# Correção — Prestação de Contas ignorando pedidos excluídos

## Arquivo alterado

- `src/app/api/bazar-sementinha/report/route.ts`

## O que foi corrigido

A Prestação de Contas estava considerando pedidos com status `excluido` nos totais e agrupamentos, mesmo depois de eles terem sido removidos pela área de Gestão.

Agora a API de relatório:

1. Remove pedidos com status `excluido` antes de calcular qualquer total.
2. Considera como vendidos apenas pedidos ativos, ou seja, pedidos que não estão `cancelado` nem `excluido`.
3. Considera como pagos apenas pedidos ativos com `payment_status = pago`.
4. Considera como pendentes apenas pedidos ativos com `payment_status` diferente de `pago`.
5. Mantém em `Cancelado` apenas pedidos com status `cancelado`, sem misturar com excluídos.
6. Ignora pagamentos vinculados somente a pedidos excluídos.
7. Recalcula os totais por forma de pagamento com base nos pedidos ativos vinculados ao pagamento.
8. Corrige os agrupamentos de itens vendidos para não considerar itens de pedidos excluídos.
9. Mantém o detalhamento dos itens do Bazar por categoria.

## Passo a passo para atualização

1. Extraia o zip na raiz do projeto `automacao-extrema`, substituindo os arquivos existentes.

2. Rode as validações:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

3. Se passar, faça o commit:

```powershell
git add src/app/api/bazar-sementinha/report/route.ts docs/PASSO_A_PASSO_AJUSTES_PRESTACAO_EXCLUIDOS_BAZAR.md
git commit -m "Corrige prestacao de contas para ignorar pedidos excluidos"
git push
```

4. Após o deploy, abra:

```txt
/bazar-sementinha/prestacao-contas
```

5. Confirme se os totais ficam zerados quando todos os pedidos de teste tiverem sido excluídos na Gestão.
