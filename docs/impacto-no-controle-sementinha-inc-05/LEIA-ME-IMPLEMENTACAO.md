# Automação Extrema — Impacto no Controle — Sementinha — InC-05

Base recebida:
- branch: `feature/impacto-no-controle-sementinha-v1`
- commit: `069bd84c1566fba220063be615f1f62e03f2c42c`
- working tree indicada pelo pacote: limpa

## Implementado

### 1. Cabeçalho da campanha
Na primeira linha do cabeçalho público da campanha passam a aparecer:
- `AJUDA?` — abre o WhatsApp do Suporte;
- `INÍCIO` — abre a mesma campanha forçando a reabertura do popup inicial.

A segunda linha com `Desenvolvido por Automação Extrema` é preservada.

### 2. Reabertura explícita do popup
O botão `INÍCIO` usa `?inicio=1`.

`CampaignIntroModal`:
- reconhece `inicio=1`;
- abre o popup mesmo que `Não mostrar novamente neste navegador` tenha sido usado;
- também ignora a marca temporária usada pelo botão `COMEÇAR`;
- remove `inicio=1` da URL após consumir a ação, sem recarregar a página.

Assim:
- `COMEÇAR` continua levando à campanha sem reabrir o popup;
- `INÍCIO` sempre permite rever o popup;
- a preferência permanente do navegador não é apagada.

### 3. Cabeçalho das páginas de reserva
Em todos os estados da página `/reserva/[token]` — aguardando pagamento, comprovante já enviado e reserva indisponível — o cabeçalho passa a mostrar:
- identidade do Sementinha;
- `AJUDA?`;
- `INÍCIO`.

`INÍCIO` retorna à campanha com o popup inicial aberto.

### 4. Remoção da identidade duplicada
Dentro do card `Reserva criada. Escolha como pagar.`, foram removidos:
- o segundo logo do Sementinha;
- o segundo selo/texto `Sementinha`.

A identidade continua aparecendo apenas no cabeçalho, como solicitado.

## Arquivos alterados
- `src/components/impacto-no-controle/PublicHeader.tsx`
- `src/components/impacto-no-controle/CampaignIntroModal.tsx`
- `src/app/solucoes/impacto-no-controle/acao/[slug]/page.tsx`
- `src/app/solucoes/impacto-no-controle/reserva/[token]/page.tsx`
- `src/components/impacto-no-controle/ReservationPayment.tsx`

## Banco / Vercel
- nova migration Supabase: **não**
- nova tabela/coluna: **não**
- nova variável Vercel: **não**
- alteração nas variáveis `PIX_*`: **não**
- alteração em `vercel.json`: **não**

## Validação feita
Os 5 arquivos TS/TSX foram processados pelo parser/transpilador TypeScript 5.8.3 sem erros de sintaxe.

No repositório completo execute:
```powershell
npm run lint
npm run build
```

## Homologação sugerida
1. Abra a campanha normalmente e feche o popup.
2. Confira `AJUDA?` e `INÍCIO` na primeira linha do cabeçalho.
3. Teste `AJUDA?`.
4. Use `Não mostrar novamente neste navegador`, recarregue e confirme que o popup não abre.
5. Clique `INÍCIO` e confirme que o popup abre mesmo assim.
6. Clique `COMEÇAR` e confirme que volta à campanha sem abrir o popup.
7. Crie uma reserva.
8. Confirme `AJUDA?` e `INÍCIO` no cabeçalho da reserva.
9. Confirme que não existe mais um segundo logo/texto `Sementinha` dentro do card.
10. Clique `INÍCIO` na reserva e confirme retorno à campanha com popup aberto.
