# Passo a passo — ajustes finais do cabeçalho mobile do Corrente em Dia

## O que foi ajustado

- Os botões **Quero Conhecer** e **Já sou Cliente** saíram da primeira linha do cabeçalho.
- A primeira linha ficou dedicada ao logo e ao nome **Corrente em Dia**.
- A segunda linha ficou mais compacta, no padrão **Desenvolvido por Automação Extrema**, com logo retangular.
- A terceira linha passou a reunir os CTAs e o menu de seções:
  - Quero Conhecer
  - Já sou Cliente
  - Solução
  - Painel
  - Contribuição
  - Benefícios
  - Como Funciona
  - Cliente Fundador
- A terceira linha foi ajustada para quebrar em várias linhas no celular, sem rolagem lateral.
- O espaçamento inicial da landing foi reduzido, aproximando o texto **Solução para arrecadações** do título principal.

## Arquivos alterados

```txt
src/components/ae-solution-header.tsx
src/app/solucoes/corrente-em-dia/page.tsx
docs/PASSO_A_PASSO_AJUSTES_HEADER_MOBILE_CORRENTE_EM_DIA.md
```

## Como aplicar

1. Faça backup da pasta atual do projeto.
2. Extraia o ZIP recebido por cima da pasta:

```txt
C:\Users\lacos\Documents\GitHub\automacao-extrema
```

3. No PowerShell, acesse o projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

4. Rode as validações:

```powershell
npm run lint
npm run build
npm run dev
```

5. Valide localmente:

```txt
http://localhost:3000/solucoes/corrente-em-dia
http://localhost:3000/solucoes/corrente-em-dia/quero-conhecer
```

## Atualizar GitHub

```powershell
git status
git add .
git commit -m "Ajusta cabecalho mobile do Corrente em Dia"
git push origin main
```

Se a branch principal for `master`, use:

```powershell
git push origin master
```

## Atualizar Vercel

Se o projeto Vercel estiver conectado ao GitHub, o deploy inicia automaticamente após o `git push`.

Valide em produção:

```txt
https://www.automacaoextrema.com/solucoes/corrente-em-dia
https://www.automacaoextrema.com/solucoes/corrente-em-dia/quero-conhecer
```

Se o deploy automático não iniciar, force pela Vercel CLI:

```powershell
npx vercel --prod
```

## Checklist visual no celular

- Primeira linha com logo e texto Corrente em Dia.
- Segunda linha compacta com “Desenvolvido por” + logo horizontal AE + “Clique no logo e nos conheça”.
- Terceira linha sem rolagem horizontal, com botões quebrando em múltiplas linhas.
- Botão “Quero Conhecer” em verde, mais chamativo.
- Espaço reduzido entre “Solução para arrecadações” e o título principal.
