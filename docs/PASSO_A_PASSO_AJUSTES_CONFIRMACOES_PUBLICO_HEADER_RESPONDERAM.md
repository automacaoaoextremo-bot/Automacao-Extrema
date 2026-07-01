# Presença Querida — Ajustes no link público de confirmações

## Foco do ajuste

O ajuste foi feito principalmente na página pública de acompanhamento das confirmações:

```txt
/solucoes/presenca-querida/confirmacoes/TOKEN
```

## Arquivos atualizados

Copie os arquivos do ZIP respeitando exatamente a mesma estrutura de pastas:

```txt
src/app/solucoes/presenca-querida/confirmacoes/[token]/page.tsx
src/components/ae-solution-header.tsx
```

## O que foi alterado

1. O cabeçalho público agora permite uma segunda linha fixa abaixo de **Desenvolvido por Automação Extrema**.
2. A informação do evento foi movida para essa segunda linha do cabeçalho:

```txt
Daniela 50 anos • 19/12/2026 • 12h30 às 17h30
```

3. A mesma informação foi removida do bloco principal da página, evitando duplicidade.
4. O card/seção **Já responderam** foi removido, pois estava redundante com a lista por status.
5. A tela continua mobile friendly, sem ações administrativas e sem necessidade de login.

## Passo a passo para aplicar

1. Feche o servidor local, se estiver rodando.

2. Extraia o ZIP recebido.

3. Copie a pasta `src` extraída para a raiz do projeto:

```txt
C:\Users\lacos\Documents\GitHub\automacao-extrema
```

4. Confirme a substituição dos arquivos quando o Windows perguntar.

5. Rode as validações:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
npm run lint
npx tsc --noEmit
npm run build
```

6. Suba para o GitHub/Vercel normalmente.

## SQL

Não há SQL obrigatório nesta atualização.

## Validação visual recomendada

Abra no celular ou no modo responsivo do navegador:

```txt
/solucoes/presenca-querida/confirmacoes/TOKEN
```

Confira se:

- o topo com **Presença Querida** permanece fixo;
- a faixa **Desenvolvido por Automação Extrema** permanece fixa;
- a linha do evento aparece logo abaixo no cabeçalho;
- o bloco principal começa direto com **Acompanhamento público / Confirmações de presença**;
- não aparece mais o card **Já responderam**;
- a lista por status continua visível e fácil de navegar no mobile.
