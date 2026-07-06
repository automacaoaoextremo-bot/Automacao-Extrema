# Correção de deploy na Vercel usando Yarn Classic

## Por que esta correção existe

O deploy anterior confirmou que a Vercel já estava respeitando o `vercel.json`, mas o erro passou a acontecer no `pnpm install`, com `ERR_PNPM_META_FETCH_FAIL` e `ERR_INVALID_THIS`.

Para contornar a falha antes do build, esta versão deixa de usar `npm` e `pnpm` na instalação da Vercel e força o uso do Yarn Classic apenas no ambiente de deploy.

## Arquivos alterados

- `package.json`
  - removido `packageManager: pnpm@...`
  - mantido `engines.node = 20.x`

- `vercel.json`
  - `installCommand`: `yarn install --no-lockfile --network-timeout 600000 --ignore-engines`
  - `buildCommand`: `yarn build`

- `.yarnrc`
  - registry oficial do npm
  - timeout maior
  - ignore-engines true

## Passo a passo

1. Copie os arquivos deste zip para a raiz do projeto.
2. Faça commit:

```bash
git add package.json vercel.json .yarnrc docs/PASSO_A_PASSO_CORRECAO_DEPLOY_YARN_VERCEL.md
git commit -m "Troca instalacao da Vercel para Yarn"
git push
```

3. Na Vercel, vá em **Settings > General > Build & Development Settings**.
4. Se existir Install Command manual, altere para:

```bash
yarn install --no-lockfile --network-timeout 600000 --ignore-engines
```

5. Confirme que o Build Command está como:

```bash
yarn build
```

6. Em **Node.js Version**, selecione **20.x**.
7. Faça **Redeploy** com **Clear build cache**.

## O que o próximo log deve mostrar

```txt
Running "install" command: `yarn install --no-lockfile --network-timeout 600000 --ignore-engines`
```

Se aparecer `npm install`, `npm ci` ou `pnpm install`, alguma configuração manual na Vercel ainda está sobrepondo o `vercel.json`.
