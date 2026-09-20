# Automação Extrema — Impacto no Controle — Sementinha — InC-08

Base recebida:
- branch: `feature/impacto-no-controle-sementinha-v1`
- commit: `d3299e2876f16730fbdd20bff88fb16d6beb22f8`
- working tree indicada no pacote: limpa

## Implementado

### 1. INÍCIO reabre o popup com URL limpa
O `PublicHeader` não depende mais de navegação client-side para a própria rota.

Ao tocar em `INÍCIO`:
1. grava uma flag de uso único em `sessionStorage`;
2. força uma navegação completa para a URL canônica da campanha;
3. `CampaignIntroModal` consome a flag e abre o popup;
4. a URL permanece sem `?inicio=1`.

O suporte ao parâmetro antigo foi mantido apenas como compatibilidade defensiva no modal, mas o botão `INÍCIO` deixa de gerá-lo.

### 2. Já fiz o Pix — enviar comprovante
Na página da reserva foi incluído o botão:

`JÁ FIZ O PIX — ENVIAR COMPROVANTE`

Ele:
- mantém a reserva atual;
- considera `Pix` como forma de pagamento;
- pula diretamente para a etapa 3 do fluxo `PIX / COMPROVANTE`;
- permite anexar e enviar o comprovante sem obrigar o usuário a rever QR Code/chave Pix.

A validação continua vinculada ao `reservation_token`, portanto o comprovante nunca fica sem uma reserva identificada.

### 3. Vídeo/tutorial atualizado com telas reais
Foram atualizados, mantendo os mesmos nomes públicos:
- `passo-a-passo-participar-sementinha.pptx`;
- `passo-a-passo-participar-sementinha.pdf`;
- `passo-a-passo-participar-sementinha.mp4`.

O vídeo tem aproximadamente 55 segundos, 1280x720, H.264, e inclui telas reais fornecidas no InC-08:
- página pública da campanha;
- popup inicial;
- página da reserva.

O passo de pagamento também passou a explicar o atalho para quem já fez o Pix e precisa somente enviar o comprovante.

### 4. Conferência do comprovante na Gestão
Ao tocar em `Aprovar`, a Gestão abre uma tela de conferência e exige:
- data e horário que constam no comprovante;
- confirmação se o nome do pagador é o mesmo do participante;
- se for diferente, nome que consta no comprovante.

Também é exibida a forma de pagamento registrada (`Pix` ou `Outra forma combinada com o Suporte`).

Depois da aprovação, a tabela mostra, quando disponíveis:
- data/hora do pagamento;
- nome do pagador.

### 5. Dados estruturados no banco
A migration InC-08 adiciona a `inc_contributions`:
- `payment_method`;
- `payment_occurred_at`;
- `payer_matches_participant`;
- `payer_name`.

A view `inc_admin_contributions` foi atualizada com esses campos.

### 6. Aprovação transacional e auditoria
A migration cria:

`inc_admin_approve_contribution(...)`

A RPC, em uma transação PostgreSQL:
- confirma que a participação está aguardando conferência;
- exige comprovante;
- grava os dados do pagamento/pagador;
- muda a participação para `approved`;
- confirma os números;
- registra `contribution_approved` em `inc_audit_logs`.

### 7. Forma de pagamento persistida
O envio público de comprovante passa a gravar `payment_method` diretamente.

A RPC `inc_admin_register_contribution_proof(...)` também foi evoluída para gravar a forma de pagamento quando o comprovante é inserido pela Gestão.

### 8. Relatório de contribuições
Na área `Pagamentos e participações` foram incluídos:
- `Exportar XLSX`;
- `Exportar PDF`.

O relatório inclui:
- Data da reserva;
- Participante;
- Celular;
- E-mail;
- Números;
- Valor;
- Forma de pagamento;
- Data/hora do pagamento;
- Pagador é o participante?;
- Nome do pagador;
- Status;
- Data da aprovação.

A exportação XLSX é gerada sem dependência nova, usando OOXML/ZIP nativo do módulo.
O PDF também é gerado no servidor sem biblioteca externa adicional.

## Arquivos alterados
- `src/components/impacto-no-controle/PublicHeader.tsx`
- `src/components/impacto-no-controle/ReservationPayment.tsx`
- `src/components/impacto-no-controle/admin/CampaignDetailClient.tsx`
- `src/app/api/impacto-no-controle/participate/route.ts`
- `src/app/api/impacto-no-controle/admin/contributions/[id]/approve/route.ts`
- `src/app/solucoes/impacto-no-controle/impacto.css`
- `public/impacto-no-controle/sementinha/tutorial/passo-a-passo-participar-sementinha.pptx`
- `public/impacto-no-controle/sementinha/tutorial/passo-a-passo-participar-sementinha.pdf`
- `public/impacto-no-controle/sementinha/tutorial/passo-a-passo-participar-sementinha.mp4`

## Arquivos novos
- `src/lib/impacto-no-controle/report.ts`
- `src/app/api/impacto-no-controle/admin/campaigns/[id]/contributions-report/route.ts`
- `supabase/migrations/20260920150000_impacto_no_controle_sementinha_inc08.sql`
- `docs/impacto-no-controle-sementinha-inc-08/LEIA-ME-IMPLEMENTACAO.md`

## Banco / Vercel
- nova migration Supabase: **sim**
- novas tabelas: **não**
- novas colunas: **sim — 4**
- novas RPCs: **sim — 1**
- RPC existente evoluída: **sim — registro administrativo de comprovante**
- nova variável Vercel: **não**
- alteração em `vercel.json`: **não**
- alteração nas variáveis `PIX_*`: **não**
- nova dependência npm: **não**

## Validações realizadas nesta entrega
- parser/transpilador TypeScript 5.8.3 nos arquivos TS/TSX alterados/novos: sem erro de sintaxe;
- XLSX de teste aberto com `openpyxl`: OK;
- PDF de teste validado e renderizado: OK;
- PPTX convertido para PDF e telas verificadas: OK;
- vídeo validado com `ffprobe`: H.264, 1280x720, ~55 s.

No repositório completo execute obrigatoriamente:

```powershell
npm run lint
npm run build
```

## Homologação recomendada
1. Aplicar a migration InC-08.
2. Abrir a campanha sem popup e clicar `INÍCIO`.
3. Confirmar popup aberto e URL sem `?inicio=1`.
4. Criar uma reserva.
5. Clicar `JÁ FIZ O PIX — ENVIAR COMPROVANTE`.
6. Confirmar abertura direta da etapa de envio.
7. Enviar comprovante Pix.
8. Na Gestão, abrir comprovante e clicar `Aprovar`.
9. Informar data/hora do comprovante.
10. Testar `pagador = participante`.
11. Criar outra participação e testar `pagador diferente`, registrando o nome.
12. Conferir os dados na tabela após aprovação.
13. Exportar XLSX e abrir no Excel/LibreOffice.
14. Exportar PDF e conferir conteúdo.
15. Abrir o vídeo tutorial e confirmar as telas reais do sistema.
