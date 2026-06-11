# Atualização — Cadastro de nova solução na Gestão AE

## O que foi implementado

1. Botão **+ Nova solução** na página `/admin/ae/solucoes`.
2. Nova tela `/admin/ae/solucoes/nova` para cadastrar soluções.
3. Cadastro com os campos:
   - Nome
   - Slug
   - Descrição curta
   - Público-alvo
   - Dores principais
   - Status
   - Etapa
   - Prioridade
   - Arquivo de origem
   - Ativa/Inativa
4. Geração automática de slug a partir do nome, com opção de edição manual.
5. Validação client-side e server-side dos campos obrigatórios.
6. Mensagem de sucesso após cadastro com opções para:
   - Editar solução cadastrada
   - Voltar para Soluções
   - Ir para Gestão
   - Cadastrar outra solução
7. A API `/api/admin/solutions` agora aceita `POST` para criar soluções.

## Arquivos alterados

```text
src/app/admin/ae/solucoes/page.tsx
src/app/api/admin/solutions/route.ts
```

## Arquivos novos

```text
src/app/admin/ae/solucoes/nova/page.tsx
PASSO_A_PASSO_NOVA_SOLUCAO.md
```

## SQL

Não é necessário rodar SQL nesta atualização, pois a tabela `ae_solutions` já possui os campos utilizados pelo cadastro.

## Como atualizar o projeto local

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

git status
git add .
git commit -m "backup antes do cadastro de nova solucao"
```

Depois, descompacte o zip desta atualização por cima da pasta do projeto, substituindo os arquivos.

Instale dependências e valide:

```powershell
npm install
npm run lint
npm run build
npm run dev
```

Acesse:

```text
http://localhost:3000/login
http://localhost:3000/admin/ae/solucoes
http://localhost:3000/admin/ae/solucoes/nova
```

## Checklist de teste

1. Faça login na Gestão.
2. Acesse **Soluções**.
3. Clique em **+ Nova solução**.
4. Preencha todos os campos obrigatórios.
5. Salve.
6. Verifique se aparece a mensagem **Solução cadastrada com sucesso.**
7. Clique em **Voltar para Soluções** e confira se a nova solução aparece na lista.
8. Clique em **Ir para Gestão** e confira se a solução aparece no painel quando estiver ativa.
9. Faça um diagnóstico novo para validar se a solução ativa fica disponível para futuras regras de pontuação.

## Publicar no Vercel

Depois de validar localmente:

```powershell
git status
git add src/app/admin/ae/solucoes/page.tsx src/app/admin/ae/solucoes/nova/page.tsx src/app/api/admin/solutions/route.ts PASSO_A_PASSO_NOVA_SOLUCAO.md package-lock.json package.json
git commit -m "feat: adiciona cadastro de nova solucao na gestao ae"
git push
```

A Vercel deve iniciar o deploy automaticamente pelo GitHub.

## Observação sobre variáveis de ambiente

Se o build local reclamar de Supabase, confirme se o `.env.local` possui:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

No Vercel, confirme as mesmas variáveis em:

```text
Project > Settings > Environment Variables
```
