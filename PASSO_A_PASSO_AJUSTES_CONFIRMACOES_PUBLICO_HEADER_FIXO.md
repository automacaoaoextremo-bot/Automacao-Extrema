# Presença Querida — Ajuste do cabeçalho fixo no link público de confirmações

## Objetivo

Ajustar principalmente o link público das confirmações:

```txt
/solucoes/presenca-querida/confirmacoes/TOKEN
```

O topo circulado na imagem passa a permanecer fixo durante a rolagem no celular:

- Presença Querida
- Desenvolvido por Automação Extrema
- Daniela 50 anos • 19/12/2026 • 12h30 às 17h30

Também foi ajustado o espaçamento inicial do conteúdo para evitar que o card "Acompanhamento público" fique escondido atrás do cabeçalho fixo.

## Arquivos atualizados

Copiar os arquivos do ZIP para os respectivos caminhos do projeto:

```txt
src/components/ae-solution-header.tsx
src/app/solucoes/presenca-querida/confirmacoes/[token]/page.tsx
```

## Passo a passo

1. Feche o servidor local, se estiver rodando.
2. Extraia o ZIP recebido.
3. Copie os arquivos extraídos para dentro do projeto, mantendo exatamente a mesma estrutura de pastas.
4. Substitua os arquivos atuais quando o Windows perguntar.
5. Na raiz do projeto, rode:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

6. Suba novamente o servidor local:

```powershell
npm run dev
```

7. Teste no celular ou em modo responsivo o link público:

```txt
/solucoes/presenca-querida/confirmacoes/TOKEN
```

## O que mudou tecnicamente

### `src/components/ae-solution-header.tsx`

Foi criado o parâmetro opcional:

```tsx
fixed?: boolean;
```

Quando usado, o cabeçalho deixa de ser apenas `sticky` e passa a ser `fixed`, mantendo todo o bloco superior preso ao topo da tela.

### `src/app/solucoes/presenca-querida/confirmacoes/[token]/page.tsx`

A página pública das confirmações passou a usar:

```tsx
<AeSolutionHeader fixed ... />
```

Também foi adicionado `padding-top` responsivo na primeira seção de conteúdo, para compensar a altura do cabeçalho fixo.

## SQL

Não há SQL obrigatório nesta atualização.
