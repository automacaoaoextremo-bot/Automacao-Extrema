# Atualização de layout mobile - Automação Extrema

## Ajustes incluídos

1. Troca do logo do cabeçalho pelo logo horizontal `public/ae-logo-horizontal.png`.
2. Aumento do logo no mobile, mantendo responsividade para não quebrar o cabeçalho.
3. Redução do espaço entre o cabeçalho fixo e a primeira frase da landing page.
4. Remoção do botão `Acessar gestão` do corpo da landing page.
5. Acesso à gestão mantido apenas no cabeçalho.

## Arquivos alterados

- `src/components/site-header.tsx`
- `src/app/page.tsx`

## Arquivo novo

- `public/ae-logo-horizontal.png`

## Como atualizar localmente

1. Faça um backup ou commit antes de substituir os arquivos:

```powershell
git status
git add .
git commit -m "backup antes dos ajustes de layout mobile"
```

2. Descompacte o zip recebido por cima da pasta do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

3. Rode os testes:

```powershell
npm run lint
npm run build
npm run dev
```

4. Acesse localmente:

```text
http://localhost:3000
```

## Como publicar no Vercel

Depois de validar localmente:

```powershell
git status
git add src/components/site-header.tsx src/app/page.tsx public/ae-logo-horizontal.png PASSO_A_PASSO_ATUALIZACAO_LAYOUT.md
git commit -m "fix: ajusta logo e CTA da landing mobile"
git push
```

A Vercel deve iniciar o deploy automaticamente pelo GitHub.

## Conferência visual recomendada

No celular, confirmar:

- O logo horizontal aparece legível no cabeçalho.
- O cabeçalho continua fixo.
- As opções `Diagnóstico` e `Gestão` continuam visíveis no cabeçalho público.
- Em páginas logadas, aparece a opção `Sair`.
- O espaço entre cabeçalho e a frase `Diagnóstico de dores e oportunidades` foi reduzido.
- O CTA principal visível na landing é `Fazer diagnóstico gratuito`.
