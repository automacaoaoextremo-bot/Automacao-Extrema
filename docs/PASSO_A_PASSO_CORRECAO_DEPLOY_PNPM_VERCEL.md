# Correção do deploy na Vercel usando pnpm e Node 20

## Problema

A Vercel falhou antes do build do Next.js, durante a instalação de dependências, com:

```txt
npm error Exit handler never called!
```

Esse erro vem do próprio npm. Como o problema acontece antes do build, a correção prioriza tirar o deploy do caminho do npm e usar pnpm via Corepack.

## Arquivos alterados

- `package.json`
  - adicionado `packageManager`: `pnpm@9.15.9`
  - adicionado `engines.node`: `20.x`
- `vercel.json`
  - instalação passa a usar `corepack` + `pnpm`
  - build passa a usar `pnpm run build`
- `.npmrc`
  - registry oficial e flags para evitar audit/fund no install

## Passo a passo

1. Copie os arquivos do zip para a raiz do projeto.
2. Faça commit:

```bash
git add package.json vercel.json .npmrc docs/PASSO_A_PASSO_CORRECAO_DEPLOY_PNPM_VERCEL.md
git commit -m "Troca install da Vercel para pnpm e Node 20"
git push
```

3. Na Vercel, vá em **Settings > General > Build & Development Settings**.
4. Se existir um **Install Command** manual antigo, troque para:

```bash
corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --no-frozen-lockfile
```

Ou deixe vazio para usar o `vercel.json`.

5. Em **Settings > General > Node.js Version**, selecione **20.x**.
6. Faça **Redeploy** marcando **Clear build cache**.

## Observação

Como não foi gerado `pnpm-lock.yaml` localmente, o comando usa `--no-frozen-lockfile`. Depois que o deploy passar, se desejar, gere um `pnpm-lock.yaml` localmente com:

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install
```

Depois commit o `pnpm-lock.yaml` e altere o installCommand para `pnpm install --frozen-lockfile`.
