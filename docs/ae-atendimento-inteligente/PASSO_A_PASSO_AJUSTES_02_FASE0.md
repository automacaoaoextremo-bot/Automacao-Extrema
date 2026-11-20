# AE Atendimento Inteligente — Ajustes 02 | Fase 0 de homologação assistida

**Data:** 04/11/2026  
**Repositório:** `automacaoaoextremo-bot/Automacao-Extrema`  
**Branch obrigatória:** `feature/ae-atendimento-inteligente-multicliente-v1`  
**Worktree:** `C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento`

## Escopo desta entrega

1. Página de apresentação `/solucoes/atendimento-inteligente`, com identidade visual textual da RMC, estrutura compatível com o padrão AE e comunicação focada em benefícios.
2. Página `/solucoes/atendimento-inteligente/solicitar` com serviços reais da RMC e categorias iniciais do Centro Automotivo Piloto.
3. **Fase 0 — N1 assistido:** profissional AE entra com conta autenticada e registra o pedido com consentimento do cliente. O banco registra a origem `assisted_n1` e o ID real do operador.
4. **N2 Anderson:** painel existente recebe a lista de pedidos, evidências, status e notas de acompanhamento.
5. Fotos (JPEG, PNG, WebP de até 5 MB cada, máximo 3) e vídeo (MP4/WebM de até 15 MB, máximo 1). Upload direto ao bucket privado `ae-ai-request-media` via URL temporária assinada do Supabase, sem atravessar o limite de corpo de requisição da Vercel.
6. Preparação para cadastro do próprio cliente, **desativado por padrão** até que a equipe aprove a experiência e configure Cloudflare Turnstile (cliente anônimo não cria solicitação antes disso).
7. Login próprio dos operadores em `/solucoes/atendimento-inteligente/entrar`, reutilizando Supabase Auth e `ae_ai_memberships`.

### Fora do escopo

- Não lê nem sincroniza mensagens existentes no WhatsApp Business.
- Não liga a Cloud API, não usa BotConversa, não importa contatos de WhatsApp Web e não envia mensagens reais na Fase 0.
- Não calcula automaticamente orçamento, não consulta Google Agenda, não emite laudo, não gera nota fiscal.
- Não cria contas abertas de operador. A equipe é cadastrada pelo administrador AE no Supabase Auth.
- A identidade RMC usa **marca tipográfica provisória**, pois o logotipo original não constou dos fontes recebidos. Substituir pelo arquivo oficial antes de divulgação ampla.

## A. Preparação e conferência da branch (Windows PowerShell)

```powershell
$repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$branch = 'feature/ae-atendimento-inteligente-multicliente-v1'
$zip = 'C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-02-IMPLEMENTACAO.zip'
cd $repo
git status -sb
git branch --show-current
git worktree list
git fetch origin --prune
```

**Antes de continuar**: confirme que `git branch --show-current` é igual a `$branch`. Se houver arquivos modificados, preserve-os, revise diffs e faça commit isolado ou backup; não execute `git reset --hard` nem `git clean -fd`.

O script abaixo salva os dois arquivos já existentes que esta entrega substitui:

```powershell
$backup = Join-Path 'C:\Users\lacos\Documents\zips' ('backup-ae-ai-ajustes-02-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Copy-Item (Join-Path $repo 'src\components\atendimento-inteligente\panel.tsx') $backup -ErrorAction Stop
Copy-Item (Join-Path $repo 'src\app\solucoes\atendimento-inteligente\painel\page.tsx') $backup -ErrorAction Stop
```

**Instalar:** coloque o ZIP baixado em `$zip` e extraia **na raiz do worktree**, preservando subpastas:

```powershell
Expand-Archive -LiteralPath $zip -DestinationPath $repo -Force
cd $repo
git status -sb
git diff --stat
git diff --check
```

O arquivo `01_MANIFESTO_AJUSTES_02.txt` relaciona todos os caminhos incluídos.

## B. Supabase — banco de dados e permissões

1. Confirme que a migration V1 `supabase/migrations/20261103180000_ae_atendimento_inteligente_v1.sql` **já foi executada no projeto correto**.
2. Faça backup/snapshot.
3. No SQL Editor **do ambiente de homologação**, execute integralmente:
   `supabase/migrations/20261104173000_ae_atendimento_inteligente_ajustes_02.sql`.
4. A nova migration cria/atualiza `ae_ai_requests`, `ae_ai_request_media`, `ae_ai_request_history`, funções SQL transacionais e o bucket privado `ae-ai-request-media`. Não executá-la duas vezes: há uma constraint de unicidade criada uma única vez.
5. O script deixa `public_intake_enabled = false` para RMC e Piloto. Não ativa bot nem canal Meta.
6. Gere contas de operadores em **Supabase → Authentication → Users**, com e-mail confirmado, senha segura e políticas de MFA apropriadas. Em seguida associe as contas às empresas.

Exemplo para associar o Anderson à RMC (substitua o e-mail ilustrativo):

```sql
insert into public.ae_ai_memberships(organization_id,user_id,role)
select o.id,u.id,'owner'
from public.ae_ai_organizations o, auth.users u
where o.slug='reparos-rmc' and lower(u.email)=lower('EMAIL_REAL_DO_ANDERSON')
on conflict (organization_id,user_id) do update set role=excluded.role;
```

Para sua conta como N1, repita com seu e-mail e `role='operator'` ou confirme que você consta em `ae_ai_platform_admins`. Nunca conceda acesso administrativo amplo a um usuário do cliente.

Validações SQL:

```sql
select slug,name,status,public_intake_enabled,automation_enabled
from public.ae_ai_organizations
where slug in ('reparos-rmc','piloto-automotivo');

select tablename, rowsecurity
from pg_tables
where schemaname='public' and tablename in
('ae_ai_requests','ae_ai_request_media','ae_ai_request_history');

select id,name,public,file_size_limit,allowed_mime_types
from storage.buckets where id='ae-ai-request-media';
```

**Resultado esperado:** as duas empresas sem autoatendimento público e bot desligado; três tabelas protegidas por RLS; bucket privado.

## C. Variáveis de ambiente

O projeto Next.js existente exige estas três configurações tanto em `.env.local` (worktree) quanto no Vercel do ambiente correspondente:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=CHAVE_PUBLICA
SUPABASE_SERVICE_ROLE_KEY=CHAVE_PRIVILEGIADA_SOMENTE_SERVIDOR
```

As variáveis da Fase 0 usam estes valores:

```dotenv
AE_AI_PUBLIC_REQUESTS_ENABLED=false
AE_AI_SEND_LIVE=false
```

Mantenha as credenciais Meta **não configuradas nesta fase**, a menos que a V1 já dependa delas para um número de teste explicitamente autorizado. Não conecte o número comercial do Anderson neste piloto.

Para **futura** habilitação de clientes que fazem autoatendimento, configure também:

```dotenv
NEXT_PUBLIC_AE_AI_TURNSTILE_SITE_KEY=SITE_KEY_DO_CLOUDFLARE
AE_AI_TURNSTILE_SECRET_KEY=SECRET_KEY_DO_CLOUDFLARE
AE_AI_PUBLIC_REQUESTS_ENABLED=true
```

Além do Turnstile validado no servidor, altere somente a empresa autorizada:

```sql
update public.ae_ai_organizations
set public_intake_enabled=true
where slug='reparos-rmc';
```

**Não execute esse UPDATE agora.** O cliente anônimo não deve enviar pedidos antes de aprovação do piloto, retenção/privacidade documentadas, proteção contra abuso e homologação da jornada pública.

Importante: `.env.local` nunca deve entrar no Git nem em ZIP. Mantenha a service role apenas no servidor.

## D. Validação de código

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
node --version          # Next.js usa Node.js 24 conforme package.json
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Rotas para validar localmente (com `npm run dev` ativo):

- `http://localhost:3000/solucoes/atendimento-inteligente`
- `http://localhost:3000/solucoes/atendimento-inteligente/solicitar`
- `http://localhost:3000/solucoes/atendimento-inteligente/entrar`
- `http://localhost:3000/solucoes/atendimento-inteligente/painel`

## E. Roteiro de homologação da Fase 0

**Teste 1 — visitante anônimo:**
- Ver a página inicial e o formulário pelo celular.
- Sem login e com autoatendimento desativado, o envio deve ser bloqueado. Não deve surgir pedido no banco.

**Teste 2 — N1 com acesso RMC:**
- Entrar pela rota própria de operador, acessar `/solicitar` e confirmar a caixa "Registro assistido".
- Obter autorização real do cliente de teste antes de registrar dados.
- Preencher telefone com DDD, nome, categoria, bairro e descrição clara. Confirmar o consentimento.
- Enviar 1 foto pequena e, num segundo teste, um MP4 válido menor que 15 MB.
- Obter protocolo de solicitação e conferir no painel. Sem canal Meta conectado, nenhuma mensagem deve ser enviada por API.

**Teste 3 — N2 Anderson:**
- Entrar com usuário limitado à RMC.
- Visualizar o pedido, detalhes, anexos por link temporário.
- Mudar status para "Em análise", salvar uma observação e solicitar mais informações quando necessário.
- Confirmar que histórico e status foram persistidos após recarregar.
- Responder ao cliente **no WhatsApp Business já existente**, sem usar o botão de envio Cloud API para pedidos registrados manualmente.

**Teste 4 — isolamento de empresas:**
- Um operador RMC não pode obter lista, detalhes ou arquivos da Piloto manipulando IDs nas APIs.
- Um operador Piloto não deve visualizar atendimentos RMC.
- Administrador AE pode alternar apenas conforme permissão cadastrada.

**Teste 5 — mídia e segurança:**
- Tentar upload acima do tamanho permitido, extensão não aceita e mais de 3 imagens/1 vídeo.
- Tentar abrir URL assinada após expirar; não deve ficar disponível indefinidamente.
- Não deve existir URL pública permanente para mídia.
- Repetir registro do mesmo número e confirmar que as solicitações são distintas e o contato não duplica na mesma empresa.

**Teste 6 — regressão das soluções existentes:**
- Navegar nas páginas de TUCXA, Corrente em Dia, Memórias que Encantam e outras rotas críticas.
- Como a entrega muda apenas pastas do Atendimento Inteligente, regressões em outras soluções não são esperadas; valide mesmo assim.

## F. GitHub — manter branch correta

Depois que **todas** as verificações passarem:

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
git status -sb
git branch --show-current
git add src/app/solucoes/atendimento-inteligente
git add src/app/api/atendimento-inteligente/requests
git add src/components/atendimento-inteligente
git add src/lib/atendimento-inteligente/intake.ts
git add supabase/migrations/20261104173000_ae_atendimento_inteligente_ajustes_02.sql
git add docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_02_FASE0.md
git diff --cached --stat
git diff --cached --check
git commit -m 'feat(ae): atendimento assistido N1 e fila N2 ajustes 02'
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

Não inclua `main`, `.env.local`, credenciais, imagens de clientes ou backups no commit.

## G. Vercel Preview → Produção

1. Confirme que a branch do projeto já está conectada ao Vercel. Após o push, abra o deployment de **Preview** da `feature/ae-atendimento-inteligente-multicliente-v1`.
2. Verifique variáveis Supabase do ambiente **Preview** e DB de homologação. Faça os testes acima sem dados reais quando possível.
3. **Antes do merge**, aplique a migration em Supabase Production após backup, mantendo `public_intake_enabled=false`. Isso adiciona as estruturas, sem mudar fluxos existentes.
4. No Vercel, configure em **Production** `AE_AI_PUBLIC_REQUESTS_ENABLED=false` e `AE_AI_SEND_LIVE=false`; não habilite automações Meta existentes por engano.
5. Abra PR da branch para `main`. Revise arquivos alterados, CI e Preview.
6. Faça merge somente após aprovar os testes. O domínio principal seguirá o deploy associado à `main` conforme seu projeto Vercel.
7. No domínio oficial, com usuário de teste autorizado, execute um registro N1 e confirme no painel N2. Depois use 5–10 atendimentos autorizados com o Anderson.
8. O formulário de autoatendimento do **cliente anônimo permanece DESLIGADO** em produção durante a Fase 0. Quando ativado futuramente, exija Turnstile, política de privacidade e acompanhamento.

### Plano de rollback

- Bloquear imediatamente o autoatendimento público com `AE_AI_PUBLIC_REQUESTS_ENABLED=false` e `public_intake_enabled=false`.
- Não habilitar o envio real da Cloud API. Se já estiver ativo por outra iniciativa, observar o efeito global de alterar `AE_AI_SEND_LIVE`.
- Em caso de falha de UI, usar Vercel Rollback ou reverter apenas o commit/PR de Ajustes 02. **Não apague tabelas, usuários ou anexos automaticamente**: existem dados de atendimento e histórico.
- Havendo incidente com dados pessoais, suspender o acesso, preservar logs adequados e adotar as medidas de resposta conforme LGPD e procedimento interno.

## H. Métricas iniciais

Avaliar após 5–10 atendimentos: minutos gastos no N1; campos faltantes na primeira triagem; número de contatos adicionais solicitados pelo Anderson; tempo entre N1 e primeiro retorno N2; quantidade de orçamentos produzidos; avaliação de satisfação do cliente.

## I. Próximas evoluções

1. Regras de triagem personalizadas aprovadas pelo Anderson para cada categoria.
2. Área de solicitação direta para o público com Turnstile e política de privacidade.
3. Coleta de mídia e follow-up pelo WhatsApp Cloud API (somente quando autorizado).
4. Google Agenda, pré-orçamento, OS, laudos, NFS-e e manutenção recorrente.
5. Identidade visual oficial da RMC mediante envio do arquivo original de logotipo.
