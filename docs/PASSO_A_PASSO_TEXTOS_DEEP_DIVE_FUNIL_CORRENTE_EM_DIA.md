# Corrente em Dia — Textos Deep Dive e funil AE

## Arquivos alterados

- `src/app/solucoes/corrente-em-dia/quero-conhecer/page.tsx`
- `src/app/solucoes/corrente-em-dia/login/page.tsx`
- `src/app/solucoes/corrente-em-dia/page.tsx`
- `src/lib/followups.ts`
- `src/components/admin-page-shell.tsx`

## Arquivo novo

- `src/app/admin/ae/corrente-em-dia/funil/page.tsx`

## O que foi ajustado

1. A página **Quero Conhecer** passou a usar o texto aprovado: Texto 2, Alternativa 1.
2. A página **Já sou Cliente / Login** passou a usar o texto aprovado: Texto 1, Alternativa 3.
3. O texto da página pública foi consolidado para reduzir excesso de conteúdo antes do formulário.
4. Foi incluída microcopy curta de Cliente Fundador:

> Como Cliente Fundador, sua organização participa da fase inicial com implantação sem custo, acompanhamento mais próximo e prioridade nas melhorias que realmente fazem diferença para a rotina da casa.

5. Os textos de follow-up para **lead morno** e **lead esfriando** foram incluídos na área de gestão AE em:

```txt
/admin/ae/corrente-em-dia/funil
```

6. A função `buildFollowupMessage` agora gera mensagens específicas para a solução **Corrente em Dia** quando a solução sugerida possuir este nome ou termos relacionados a arrecadação/contribuição.

## Validação local

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
npm run lint
npm run build
npm run dev
```

Valide as páginas:

```txt
http://localhost:3000/solucoes/corrente-em-dia/quero-conhecer
http://localhost:3000/solucoes/corrente-em-dia/login
http://localhost:3000/admin/ae/corrente-em-dia/funil
```

## GitHub

```powershell
git status
git add .
git commit -m "Ajusta textos Deep Dive e funil Corrente em Dia"
git push origin main
```

Se sua branch principal for `master`:

```powershell
git push origin master
```

## Vercel

Se o projeto estiver conectado ao GitHub, o deploy inicia automaticamente após o `git push`.

Validar em produção:

```txt
https://www.automacaoextrema.com/solucoes/corrente-em-dia/quero-conhecer
https://www.automacaoextrema.com/solucoes/corrente-em-dia/login
https://www.automacaoextrema.com/admin/ae/corrente-em-dia/funil
```

Para forçar deploy:

```powershell
npx vercel --prod
```

## Observação

Não há SQL novo nesta etapa. A alteração é de copy, navegação da gestão AE e mensagens de follow-up.
