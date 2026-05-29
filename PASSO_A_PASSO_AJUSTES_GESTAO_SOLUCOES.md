# Passo a passo — ajustes em Gestão e Soluções

## O que foi corrigido

1. **Editar solução**
   - Incluídos botões claros para **Cancelar**, **Cancelar e voltar**, **Voltar para Soluções** e **Ir para Gestão**.
   - Após salvar, a tela mostra a mensagem de sucesso e um link direto para voltar à lista de soluções.
   - O botão de salvar passa a mostrar **Salvando...** durante o envio.

2. **Gestão > Soluções em andamento**
   - A página `/admin/ae` deixou de limitar a listagem a apenas 8 soluções.
   - Agora exibe todas as soluções ativas retornadas pela API, em ordem de prioridade.
   - Com isso, **Discoteca Digital** aparece na Gestão quando estiver com `is_active = true`.

3. **Correção preventiva de schema/cache**
   - Removida a dependência obrigatória das colunas `funnel_stage` e `next_action_at` nas APIs principais.
   - O funil continua funcionando pela tabela `ae_lead_followups`, que é a estrutura mais adequada para os próximos contatos.
   - Isso reduz a chance de erro caso o cache do schema do Supabase/Vercel esteja defasado.

## Arquivos alterados

```text
src/app/admin/ae/page.tsx
src/app/admin/ae/solucoes/[id]/page.tsx
src/app/api/diagnosticos/route.ts
src/app/api/admin/leads/route.ts
src/app/api/admin/leads/[id]/route.ts
```

## Atualização local

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

git status
git add .
git commit -m "backup antes dos ajustes de gestao e solucoes"
```

Depois descompacte este zip por cima da pasta do projeto, substituindo os arquivos.

Rode:

```powershell
npm install
npm run lint
npm run build
npm run dev
```

Teste localmente:

```text
http://localhost:3000/admin/ae
http://localhost:3000/admin/ae/solucoes
```

Validações recomendadas:

1. Entrar em **Gestão**.
2. Confirmar que **Discoteca Digital** aparece em **Soluções em andamento**.
3. Entrar em **Soluções**.
4. Abrir qualquer solução.
5. Conferir os botões **Cancelar**, **Voltar para Soluções** e **Ir para Gestão**.
6. Alterar um campo, salvar e conferir a mensagem de sucesso.
7. Clicar em **Voltar para lista de soluções**.

## SQL

Não é obrigatório rodar novo SQL para estes ajustes.

Mesmo assim, se quiser conferir a Discoteca Digital no Supabase SQL Editor:

```sql
select
  name,
  slug,
  current_status,
  stage,
  priority,
  is_active
from public.ae_solutions
where slug = 'discoteca-digital';
```

Se precisar reativar:

```sql
update public.ae_solutions
set is_active = true,
    updated_at = now()
where slug = 'discoteca-digital';
```

## Publicar no Vercel

Depois de validar localmente:

```powershell
git status
git add src/app/admin/ae/page.tsx src/app/admin/ae/solucoes/[id]/page.tsx src/app/api/diagnosticos/route.ts src/app/api/admin/leads/route.ts src/app/api/admin/leads/[id]/route.ts PASSO_A_PASSO_AJUSTES_GESTAO_SOLUCOES.md package-lock.json package.json
git commit -m "fix: ajusta edicao de solucoes e lista completa na gestao"
git push
```

A Vercel deve iniciar o deploy automaticamente pelo GitHub.

## Se a Vercel não iniciar automaticamente

Acesse:

```text
Vercel > Projeto Automação Extrema > Deployments > Redeploy
```

## Testes após deploy

Acesse a produção:

```text
https://automacao-extrema.vercel.app/admin/ae
https://automacao-extrema.vercel.app/admin/ae/solucoes
```

Confirme:

1. O cabeçalho logado continua fixo e mostra **Gestão**, **Soluções**, **Relatórios**, **Funil** e **Sair**.
2. **Discoteca Digital** aparece em **Gestão**.
3. A edição de soluções possui opção de cancelar/voltar.
4. Após salvar, existe opção clara para voltar à lista.
