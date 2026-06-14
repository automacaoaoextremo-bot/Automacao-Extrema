# Passo a passo — atualização WhatsApp Obrigado Corrente em Dia

## Arquivos atualizados

- `src/app/solucoes/corrente-em-dia/quero-conhecer/page.tsx`
- `src/app/solucoes/corrente-em-dia/obrigado/page.tsx`
- `docs/PASSO_A_PASSO_BOTCONVERSA_CORRENTE_EM_DIA_ATUALIZADO.md`

## O que mudou

1. A página `Quero Conhecer` teve os textos consolidados em um único bloco compacto.
2. Os três campos obrigatórios ficam mais próximos da primeira dobra mobile.
3. A página `Obrigado` ficou mais curta.
4. O botão de login foi removido.
5. O botão principal passou para: **Continuar seu cadastro pelo WhatsApp**.
6. A mensagem pré-preenchida do WhatsApp leva nome, WhatsApp, e-mail e código do lead.
7. A estratégia recomendada ficou: site → página Obrigado → WhatsApp pré-preenchido → BotConversa responde.

## Atualização local

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-whatsapp-obrigado-corrente.zip -Force
```

Extraia o ZIP atualizado por cima da pasta atual.

Depois rode:

```powershell
npm run lint
npm run build
npm run dev
```

## Validação local

Acesse:

```txt
http://localhost:3000/solucoes/corrente-em-dia/quero-conhecer
http://localhost:3000/solucoes/corrente-em-dia/obrigado
```

Teste:

1. Preencher nome, WhatsApp e e-mail.
2. Clicar em **Enviar interesse**.
3. Confirmar redirecionamento para `/obrigado`.
4. Clicar em **Continuar seu cadastro pelo WhatsApp**.
5. Conferir se a mensagem pré-preenchida leva nome, e-mail, WhatsApp e código do lead.

## GitHub

```powershell
git status
git add .
git commit -m "Ajusta fluxo WhatsApp da pagina Obrigado Corrente em Dia"
git push origin main
```

Se sua branch principal for `master`:

```powershell
git push origin master
```

## Vercel

Se a Vercel estiver conectada ao GitHub, o deploy inicia automaticamente após o `git push`.

Valide em produção:

```txt
https://www.automacaoextrema.com/solucoes/corrente-em-dia/quero-conhecer
https://www.automacaoextrema.com/solucoes/corrente-em-dia/obrigado
```

Para forçar deploy:

```powershell
npx vercel --prod
```

## SQL

Não há SQL novo nesta etapa.
