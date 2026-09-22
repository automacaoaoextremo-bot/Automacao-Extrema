# Automação Extrema — Impacto no Controle — Sementinha — InC-07

## Implementado

- INÍCIO reabre o popup inicial, mas a URL final fica limpa, sem `?inicio=1`.
- ETAPA2 passa a mostrar `Escolha seus números para o sorteio da campanha`, sem o prefixo `1.`.
- Os botões `DÚVIDA`, `VER LISTA` e `CONTINUAR` foram redesenhados para ficar mais claros no mobile.
- O e-mail `Participação registrada` não mostra mais o item `Cotas:`.
- Foi criado um tutorial em vídeo a partir de uma apresentação.
- O tutorial foi ligado ao popup inicial (`Como participar`) e ao cabeçalho (`VÍDEO`).
- Foram criados folder impresso e QR Codes da campanha, do Suporte e do tutorial.
- Foram criadas mensagens para coordenadores, WhatsApp, Instagram e folder.

## Arquivos alterados

- `src/components/impacto-no-controle/PublicHeader.tsx`
- `src/components/impacto-no-controle/CampaignIntroModal.tsx`
- `src/components/impacto-no-controle/CampaignParticipation.tsx`
- `src/app/solucoes/impacto-no-controle/acao/[slug]/page.tsx`
- `src/app/solucoes/impacto-no-controle/reserva/[token]/page.tsx`
- `src/app/solucoes/impacto-no-controle/obrigado/[token]/page.tsx`
- `src/app/solucoes/impacto-no-controle/acompanhar/[token]/page.tsx`
- `src/app/api/impacto-no-controle/participate/route.ts`
- `src/app/solucoes/impacto-no-controle/impacto.css`

## Arquivos novos

- `public/impacto-no-controle/sementinha/tutorial/passo-a-passo-participar-sementinha.mp4`
- `public/impacto-no-controle/sementinha/tutorial/passo-a-passo-participar-sementinha.pptx`
- `public/impacto-no-controle/sementinha/tutorial/passo-a-passo-participar-sementinha.pdf`
- `public/impacto-no-controle/sementinha/tutorial/folder-rifa-sementinha.pdf`
- `public/impacto-no-controle/sementinha/tutorial/qr-campanha.png`
- `public/impacto-no-controle/sementinha/tutorial/qr-suporte.png`
- `public/impacto-no-controle/sementinha/tutorial/qr-tutorial.png`
- `docs/impacto-no-controle-sementinha-inc-07/mensagens-comunicacao.md`
- `docs/impacto-no-controle-sementinha-inc-07/roteiro-video-e-folder.md`

## Banco / Vercel

- migration Supabase: **não**
- nova tabela/coluna: **não**
- nova variável Vercel: **não**
- alteração em `PIX_*`: **não**

## Validação realizada

- arquivos TS/TSX processados pelo TypeScript 5.8.3 sem erro de sintaxe;
- folder PDF renderizado para conferência visual;
- apresentação convertida em PDF e MP4.

Execute no repositório completo:

```powershell
npm run lint
npm run build
```

## Homologação sugerida

1. Abrir a campanha sem popup e clicar `INÍCIO`.
2. Confirmar que o popup abre e a URL fica sem `?inicio=1`.
3. Conferir botão `VÍDEO` no cabeçalho.
4. Conferir `Como participar` no popup.
5. Abrir ETAPA2 e validar o texto sem `1.`.
6. Validar os novos botões no celular.
7. Fazer uma participação e verificar o e-mail sem `Cotas:`.
8. Abrir o vídeo e o folder no Preview.
9. Testar os QR Codes.
