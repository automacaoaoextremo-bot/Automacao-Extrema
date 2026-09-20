# Automação Extrema — Impacto no Controle — Sementinha — InC-06

Base recebida:
- branch: `feature/impacto-no-controle-sementinha-v1`
- commit: `b40c1a245f4ecf4510b41be8eaca8cfdffebee7f`
- working tree indicada pelo pacote: limpa

## Implementado

### 1. Ver lista
Na página pública, abaixo de `Impacto estimado`, foi incluído `Ver lista`.

O mesmo acesso existe na ETAPA2, junto do Total da participação.

A lista:
- mostra números ocupados em ordem crescente;
- mostra o nome público do participante já permitido pela configuração `show_buyer_names`;
- permite busca por nome ou número;
- permite ordenar por número ou nome;
- diferencia reservado/em conferência e aprovado;
- possui `FECHAR`, `TIRAR DÚVIDA` e `CONTINUAR`.

A solução preserva a regra de privacidade já existente: não passa a expor nome completo quando a campanha estiver configurada para ocultar nomes.

### 2. ETAPA1 / ETAPA2 / ETAPA3
O fluxo `PARTICIPE` passa a identificar:
- `ETAPA1` — Regras da ação;
- `ETAPA2` — Escolha seus números;
- `ETAPA3` — Seus dados.

ETAPA2 e ETAPA3 possuem `VOLTAR` ao lado de `FECHAR`.

### 3. ETAPA2 compacta
Na ETAPA2:
- disponível = branco;
- selecionado/reservado = amarelo;
- aprovado = verde;
- Total, `TIRAR DÚVIDA`, `Ver lista` e `CONTINUAR` ficam na mesma faixa visual;
- o fluxo continua usando os números reais e a mesma API de reserva.

### 4. Prazo de reserva
A campanha do Sementinha é fixada em `1440` minutos.

A API de novas reservas passa a usar `reservation_minutes` da campanha, com fallback seguro de 1440.

A migration também recalcula reservas `awaiting_payment` já abertas:
- `reservation_expires_at = created_at + reservation_minutes`;
- `reserved_until` dos números é sincronizado.

### 5. Reserva compacta
A tela de reserva foi reorganizada para reduzir rolagem:
- números, valor e prazo em resumo compacto;
- `FALE COM O SUPORTE` destacado em verde;
- contador em `HH:MM:SS`;
- `GUARDAR LINK` abre popup com WhatsApp/cópias;
- `PIX / COMPROVANTE` continua abrindo o fluxo de pagamento já existente.

### 6. Obrigado / participação registrada
A tela agora:
- usa cabeçalho Sementinha + AJUDA? + INÍCIO;
- remove logo/nome duplicados dentro do conteúdo;
- concentra status, valor e números em um card compacto;
- mantém detalhes e instruções secundárias recolhidos;
- mantém acompanhamento e compartilhamento via WhatsApp.

### 7. Acompanhamento
A tela agora:
- usa o mesmo cabeçalho Sementinha + AJUDA? + INÍCIO;
- remove identidade repetida dentro do card;
- resume status, valor e números;
- coloca detalhes e dica de acompanhamento em áreas recolhidas.

### 8. Exclusão administrativa em qualquer status
Em `Pagamentos e participações`, `Excluir participação` passa a existir para qualquer status.

A nova RPC `inc_admin_delete_contribution(...)`:
- faz snapshot da contribuição e dos números para auditoria;
- libera somente números ainda vinculados àquela contribuição;
- remove a contribuição;
- registra `contribution_deleted_by_admin`.

Depois da transação, a API tenta remover o comprovante do bucket `impacto-no-controle-proofs`.
Se o Storage falhar, a exclusão do banco continua válida e a API devolve um aviso para a Gestão; dessa forma não ficam referências quebradas no banco, embora possa existir um arquivo órfão para limpeza manual.

O participante (`inc_participants`) é preservado.

## Arquivos alterados
- `src/app/solucoes/impacto-no-controle/acao/[slug]/page.tsx`
- `src/app/solucoes/impacto-no-controle/impacto.css`
- `src/components/impacto-no-controle/CampaignParticipation.tsx`
- `src/components/impacto-no-controle/ReservationPayment.tsx`
- `src/app/solucoes/impacto-no-controle/obrigado/[token]/page.tsx`
- `src/app/solucoes/impacto-no-controle/acompanhar/[token]/page.tsx`
- `src/components/impacto-no-controle/admin/CampaignDetailClient.tsx`
- `src/app/api/impacto-no-controle/reservations/route.ts`
- `src/app/api/impacto-no-controle/admin/contributions/[id]/route.ts`

## Arquivos novos
- `src/components/impacto-no-controle/CampaignParticipantList.tsx`
- `supabase/migrations/20260920123000_impacto_no_controle_sementinha_inc06.sql`

## Banco / Vercel
- nova migration Supabase: **sim**
- nova tabela: **não**
- nova coluna: **não**
- nova RPC: **sim**
- nova variável Vercel: **não**
- alteração em `vercel.json`: **não**
- alteração nas variáveis `PIX_*`: **não**

## Validação já realizada
Os arquivos TS/TSX alterados/novos foram processados pelo parser/transpilador TypeScript 5.8.3 sem erros de sintaxe.
Também foi feita verificação de espaços em branco/trailing whitespace nos arquivos de entrega.

No repositório completo execute obrigatoriamente:
```powershell
npm run lint
npm run build
```

## Homologação recomendada
1. Aplicar a migration InC-06.
2. Abrir a campanha e conferir `Ver lista`.
3. Buscar por nome e por número e testar ordenação.
4. Abrir PARTICIPE e validar ETAPA1, ETAPA2 e ETAPA3.
5. Validar VOLTAR/FECHAR.
6. Na ETAPA2, conferir branco/amarelo/verde e os botões na faixa do Total.
7. Criar uma reserva e confirmar prazo de 24 horas/1440 minutos desde a criação.
8. Conferir `FALE COM O SUPORTE`, `GUARDAR LINK` e `PIX / COMPROVANTE`.
9. Enviar comprovante e validar tela Obrigado compacta.
10. Abrir Acompanhamento e validar cabeçalho/compactação.
11. Na Gestão, excluir participações de teste em diferentes status.
12. Confirmar liberação dos números e atualização da lista pública.
