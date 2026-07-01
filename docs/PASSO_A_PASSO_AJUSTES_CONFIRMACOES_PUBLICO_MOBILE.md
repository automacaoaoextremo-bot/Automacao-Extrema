# Passo a passo — ajuste mobile do link público de confirmações

## Objetivo

Ajustar principalmente a página pública de confirmações:

```txt
/solucoes/presenca-querida/confirmacoes/TOKEN
```

O ajuste deixa a navegação mobile friendly, remove o comportamento de tabela com rolagem lateral e facilita a visualização dos nomes das pessoas que já responderam.

## Arquivo atualizado

Substituir o arquivo abaixo pela versão enviada no ZIP:

```txt
src/app/solucoes/presenca-querida/confirmacoes/[token]/page.tsx
```

## Como aplicar

1. Baixe e extraia o ZIP enviado.
2. Copie a pasta `src` extraída para a raiz do projeto:

```txt
C:\Users\lacos\Documents\GitHub\automacao-extrema
```

3. Quando o Windows perguntar, confirme a substituição do arquivo.

## O que mudou

1. A página pública de confirmações agora usa `overflow-x-hidden` no container principal.
2. O título `Confirmações de presença` passa a quebrar corretamente no mobile.
3. O card de taxa de resposta não força largura lateral no celular.
4. Os cards de totais foram reorganizados para caberem melhor em telas pequenas.
5. Foi criada uma seção no início chamada `Já responderam`, mostrando rapidamente os nomes das pessoas com resposta registrada.
6. A antiga tabela com `min-w-[820px]` foi substituída por cards responsivos.
7. Os convidados passaram a aparecer agrupados por status:

```txt
Confirmados
Talvez
Pendentes
Não poderão ir
```

8. O link continua somente leitura, sem ações administrativas.
9. O WhatsApp continua mascarado.

## Validação recomendada

Na raiz do projeto, rode:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Teste visual recomendado

1. Suba o projeto localmente:

```powershell
npm run dev
```

2. Abra o link público de confirmações no celular ou no modo responsivo do navegador:

```txt
/solucoes/presenca-querida/confirmacoes/TOKEN
```

3. Confira especialmente:

- Não deve haver rolagem horizontal.
- O título deve aparecer completo.
- A seção `Já responderam` deve aparecer logo no início.
- Os nomes devem aparecer em cards fáceis de ler.
- A lista deve estar separada por status.
