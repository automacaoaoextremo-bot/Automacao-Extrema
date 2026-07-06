# Ajustes do Caixa — Bazar no Controle

## Arquivos alterados

- `src/app/bazar-sementinha/caixa/caixa-client.tsx`
- `src/app/api/bazar-sementinha/payments/route.ts`

## O que foi ajustado

1. A tela do Caixa agora agrupa os pedidos por cliente com os detalhes recolhidos por padrão.
2. Cada cliente mostra nome, quantidade total de pedidos, valor total, quantidade/valor pagos e quantidade/valor pendentes.
3. Os detalhes dos pedidos aparecem somente ao tocar em **Ver detalhes**.
4. As categorias dos itens do Bazar aparecem no detalhe dos itens e no card de pagamento.
5. Pedidos pagos não podem ser selecionados, editados ou cancelados.
6. Pedidos pendentes têm ações de **Editar** e **Cancelar**.
7. A seleção de pagamento foi limitada a pedidos de um único cliente por vez para reduzir erro operacional.
8. O card de pagamento mostra somente o cliente e os pedidos selecionados.
9. A API de pagamentos também valida no servidor que todos os pedidos selecionados pertencem ao mesmo cliente, estão pendentes e não foram cancelados/excluídos.

## Como atualizar

1. Extraia este zip na raiz do projeto `automacao-extrema`, substituindo os arquivos existentes.
2. Rode os comandos:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

3. Se passar, faça commit e push:

```powershell
git add src/app/bazar-sementinha/caixa/caixa-client.tsx src/app/api/bazar-sementinha/payments/route.ts docs/PASSO_A_PASSO_AJUSTES_CAIXA_BAZAR.md
git commit -m "Ajusta caixa por cliente e pagamento seguro do Bazar"
git push
```

## Observação importante

A regra de selecionar pedidos de apenas um cliente por vez é recomendada. Ela evita que o caixa registre um pagamento agrupando clientes diferentes por engano e garante que o card de pagamento mostre sempre um único cliente.
