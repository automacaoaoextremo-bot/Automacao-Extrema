# Correção do deploy na Vercel — erro `npm error Exit handler never called!`

## O que aconteceu

O erro ocorreu antes do build do Next.js, durante a etapa de instalação de dependências da Vercel:

```txt
Installing dependencies...
npm error Exit handler never called!
Error: Command "npm install" exited with 1
```

Isso indica falha no próprio processo do npm usado pela Vercel, não necessariamente erro de TypeScript, Next.js ou código da solução Bazar no Controle.

## Correção aplicada no projeto

Foram adicionados dois arquivos na raiz do projeto:

```txt
vercel.json
.npmrc
```

O `vercel.json` força a Vercel a instalar as dependências com:

```bash
npm ci --no-audit --no-fund
```

Em projetos com `package-lock.json`, o `npm ci` é mais adequado para deploy porque instala exatamente as versões travadas no lockfile e evita atualizações inesperadas durante o deploy.

O `.npmrc` desativa auditoria e mensagens de funding durante o deploy, reduzindo etapas extras do npm.

## Passo a passo para atualizar no GitHub

1. Copie os arquivos do zip atualizado para a raiz do projeto, mantendo a estrutura das pastas.
2. Confirme que estes arquivos existem na raiz:

```txt
vercel.json
.npmrc
package.json
package-lock.json
```

3. Rode localmente:

```bash
npm ci --no-audit --no-fund
npm run lint
npx tsc --noEmit
npm run build
```

4. Faça commit e push:

```bash
git add .
git commit -m "Corrige instalacao npm no deploy da Vercel"
git push
```

## Passo a passo na Vercel

1. Acesse o projeto na Vercel.
2. Vá em **Settings > Build & Development Settings**.
3. Confira se o **Install Command** está vazio ou igual a:

```bash
npm ci --no-audit --no-fund
```

4. Vá em **Deployments**.
5. Clique nos três pontinhos do último deploy.
6. Escolha **Redeploy**.
7. Marque a opção **Clear build cache**.
8. Inicie o novo deploy.

## Observação importante

Se a Vercel estiver com um Install Command manual configurado como `npm install`, ele pode sobrescrever o `vercel.json`. Nesse caso, altere manualmente para:

```bash
npm ci --no-audit --no-fund
```

ou deixe o campo vazio para a Vercel respeitar o `vercel.json` do repositório.
