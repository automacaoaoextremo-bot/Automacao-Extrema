# Roteiro de implantação — AE Atendimento Inteligente Multiempresa V1

**Gerado em 03/11/2026.** Branch: `feature/ae-atendimento-inteligente-multicliente-v1`.
Este pacote é um **patch aditivo**: copia arquivos novos e substitui somente `src/app/admin/ae/page.tsx` para acrescentar o atalho ao painel. Não substitui o repositório completo.

## Fase 0 — Segurança, Git e backup

1. Confirmar que está no worktree correto, sem alterações pendentes. Se houver mudanças locais, preservar e fazer commit ou stash antes de aplicar o patch.
2. **Criar cópia/backup do banco Supabase**, especialmente porque o projeto abriga outras soluções.
3. Os comandos abaixo pressupõem que o repositório local está em:

```powershell
$repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$branch = 'feature/ae-atendimento-inteligente-multicliente-v1'
cd $repo
git status -sb
git branch --show-current
git fetch origin --prune
```

4. Branch deve ser exatamente `$branch`. Não fazer merge de `main` sem analisar conflitos se houver mudanças no remoto.

## Fase 1 — Aplicar os arquivos

1. Baixar `AE-Atendimento-Inteligente-V1-IMPLEMENTACAO.zip` para `C:\Users\lacos\Documents\zips`.
2. Aplicar **na raiz do worktree**, sem criar uma pasta extra dentro de `src`:

```powershell
$zip = 'C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-V1-IMPLEMENTACAO.zip'
$repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
Expand-Archive -LiteralPath $zip -DestinationPath $repo -Force
cd $repo
git diff --stat
git status -sb
```

3. O único arquivo existente substituído é `src/app/admin/ae/page.tsx` (atalho de navegação); se tiver alterações locais nele, usar ferramenta de diff antes de aplicar. Os demais arquivos pertencem a rotas/diretórios novos.
4. Instalar conforme o `package-lock.json` **do repositório**, sem modificar o lockfile:

```powershell
node --version
npm ci
npx tsc --noEmit
npm run lint
npm run build
```

**Importante:** `package.json` especifica Node 24.x; selecionar Node 24 para homologar e compilar. Uma máquina usando Node 22 pode gerar erro de engine. O build exige as variáveis Supabase já utilizadas no projeto.

## Fase 2 — Supabase: migration nova e admins

1. No Supabase, confirmar o projeto de homologação (recomendado: **projeto Supabase separado para Preview**).
2. Abrir **SQL Editor** e executar a migration inteira:

```
supabase/migrations/20261103180000_ae_atendimento_inteligente_v1.sql
```

3. A migration cria **somente tabelas `ae_ai_*` e funções `ae_ai_*`**, deixando as soluções atuais intactas. Cadastra RMC e Piloto com status `onboarding` e automação **desligada**.
4. Verificar a existência das empresas:

```sql
select slug, name, segment, status, automation_enabled
from public.ae_ai_organizations
order by slug;
```

5. Atribuir acesso de administrador global à sua conta **já cadastrada no Supabase Auth** (substituir e-mail antes de executar):

```sql
insert into public.ae_ai_platform_admins (user_id)
select id from auth.users where email = 'SEU_EMAIL_DE_LOGIN_AE'
on conflict (user_id) do nothing;

select u.email from public.ae_ai_platform_admins a
join auth.users u on u.id=a.user_id;
```

6. Para o Anderson ter login **somente da Reparos RMC**, primeiro criar/convidar conta em Authentication > Users, depois conceder membership (substituir e-mail):

```sql
insert into public.ae_ai_memberships(organization_id, user_id, role)
select o.id, u.id, 'owner'
from public.ae_ai_organizations o cross join auth.users u
where o.slug='reparos-rmc' and u.email='EMAIL_ANDERSON_AUTORIZADO'
on conflict (organization_id,user_id) do nothing;
```

7. A operação inversa de Piloto exige a conta do responsável pela Piloto. Não conceder ao Anderson acesso aos dados da Piloto automaticamente.

## Fase 3 — Meta: número de TESTE, webhook e credenciais

1. Acessar [Meta for Developers](https://developers.facebook.com/apps/), criar/selecionar app Business e adicionar o produto/caso de uso WhatsApp.
2. Na área **API Setup**, localizar `Phone Number ID`, `WhatsApp Business Account ID` e token de acesso **de teste**. Para produção, usar credencial autorizada e de duração adequada (ex.: token de usuário do sistema), não um token temporário para operação contínua.
3. Escolher uma versão **suportada** da Graph API nas configurações da sua aplicação (formato `vXX.0`). Não copiar versões antigas de tutoriais.
4. Criar um segredo longo aleatório para `AE_META_VERIFY_TOKEN`. O `AE_META_APP_SECRET` é o App Secret da própria aplicação Meta.
5. Configurar variáveis de ambiente do Vercel **somente no ambiente correspondente**:

```txt
AE_META_VERIFY_TOKEN=<segredo_escolhido_no_servidor>
AE_META_APP_SECRET=<app_secret_meta>
AE_META_GRAPH_VERSION=<vXX.0>
AE_AI_SEND_LIVE=false
AE_WA_TOKEN_RMC=<token_do_numero_de_teste_ou_da_waba_RMC>
```

**Nunca colocar credenciais em arquivo versionado, no ZIP, em logs de depuração ou em `NEXT_PUBLIC_*`.**

6. Se usar servidor local, configurar as mesmas variáveis em `.env.local` **não versionado**. Para a função de envio, local/Preview ficam sempre em `simulated`.
7. Cadastrar o número **de teste** do aplicativo Meta na empresa RMC no banco de homologação. Substituir `<PHONE_NUMBER_ID_TESTE>` pelo ID real (não pelo telefone):

```sql
insert into public.ae_ai_channels (organization_id, phone_number_id, token_env_key, active)
select id, '<PHONE_NUMBER_ID_TESTE>', 'AE_WA_TOKEN_RMC', true
from public.ae_ai_organizations where slug='reparos-rmc';

update public.ae_ai_organizations
set status='active', automation_enabled=true
where slug='reparos-rmc';
```

8. Não cadastrar ainda o número comercial do Anderson. O onboarding/coexistência com o aplicativo WhatsApp Business exige verificação específica de elegibilidade, permissões e autorização.
9. Em **WhatsApp > Configuration > Webhooks**, configurar URL HTTPS pública de um deployment preparado para testes:

```
https://SEU-HOST/api/webhooks/meta-whatsapp
```

O `Verify Token` deve ser o mesmo `AE_META_VERIFY_TOKEN`. Subscrever o campo **messages** da conta/autorização. Em versões/contas da Meta, a localização das opções no painel muda.

10. Antes de apontar a Meta para Preview, verificar a proteção de deployment do Vercel; um webhook HTTPS da Meta precisa conseguir realizar GET/POST. Evitar abrir todos os ambientes de Preview; use domínio de homologação controlado ou teste com o simulador local abaixo.

## Fase 4 — Homologação sem envios reais

**Verificação de rota:**

```powershell
$base = 'http://localhost:3000'
# A verificacao positiva so funciona com o token definido no processo Node.
Invoke-WebRequest "$base/api/webhooks/meta-whatsapp?hub.mode=subscribe&hub.verify_token=TOKEN_DE_VERIFICACAO&hub.challenge=123456" -UseBasicParsing
```

Deve responder HTTP 200 e corpo `123456`. Token errado deve retornar HTTP 403.

**Teste assinado de eventos**: executar o script incluído `docs/ae-atendimento-inteligente/Testar-Webhook-Local.ps1` (exige `$env:AE_META_APP_SECRET` definido na janela atual). Esse script **não transmite para Meta**: envia eventos de teste para o webhook local, com assinatura HMAC válida. O `Phone Number ID` usado no teste deve estar cadastrado e ativo no Supabase de homologação.

```powershell
$env:AE_META_APP_SECRET = [System.Net.NetworkCredential]::new('', (Read-Host 'Meta App Secret' -AsSecureString)).Password
& '.\docs\ae-atendimento-inteligente\Testar-Webhook-Local.ps1' -PhoneNumberId '<PHONE_NUMBER_ID_TESTE>'
```

Após cinco mensagens, o painel deve mostrar: contato, categoria, descrição, região, urgência, solicitação e mensagem do bot com estado **simulated**. Se o testador não receber mensagem pelo WhatsApp, isso é esperado: `AE_AI_SEND_LIVE=false`.

**Casos de teste obrigatórios antes de produção:**

- Assinatura incorreta: HTTP 401; não cria contato/mensagem.
- Verificação GET com token incorreto: HTTP 403.
- Reenvio de webhook com mesmo `message.id`: não cria mensagens duplicadas nem avanço de etapa.
- `phone_number_id` não cadastrado: evento ignorado, sem misturar clientes.
- Conta autorizada somente na RMC: não consegue consultar as conversas da Piloto.
- Texto `ATENDENTE`: transfere para modo humano, bot para de responder.
- Empresa ou canal desativado: nenhuma resposta automática.
- Preview: **zero** mensagens reais.
- Nunca informar preço, disponibilidade de agenda ou prazo sem aprovação de um operador.
- Conferir as mensagens `unknown`/`sending` antes de reenvio: um timeout pode ter ocorrido após a entrega pela Meta.

**Consultas SQL de conferência:**

```sql
select o.slug, count(distinct c.id) conversas
from public.ae_ai_organizations o
left join public.ae_ai_conversations c on c.organization_id=o.id
 group by o.slug order by o.slug;

select o.slug, b.status, count(*) total
from public.ae_ai_outbox b join public.ae_ai_organizations o on o.id=b.organization_id
 group by o.slug,b.status order by o.slug,b.status;

select o.slug, r.category, r.neighborhood, r.urgency, r.status
from public.ae_ai_requests r join public.ae_ai_organizations o on o.id=r.organization_id
order by r.created_at desc limit 20;
```

## Fase 5 — Commit / Preview / PR

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
git branch --show-current
git diff --check
git status -sb
git add src/app/admin/ae/page.tsx `
  src/app/admin/ae/atendimento-inteligente `
  src/app/solucoes/atendimento-inteligente `
  src/app/api/atendimento-inteligente `
  src/app/api/webhooks/meta-whatsapp `
  src/components/atendimento-inteligente `
  src/lib/atendimento-inteligente `
  supabase/migrations/20261103180000_ae_atendimento_inteligente_v1.sql `
  docs/ae-atendimento-inteligente

git diff --cached --check
git diff --cached --stat
git commit -m "feat(ae): inicia atendimento inteligente multicliente com Meta Cloud API"
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

1. Conferir Preview do Vercel associado à branch.
2. Verificar no ambiente Preview que `AE_AI_SEND_LIVE=false`, credenciais da Meta de teste e Supabase de homologação.
3. Executar lint, build e os testes acima; registrar evidências. **Não ativar mensagem comercial no Preview.**
4. Criar PR com base `main` e branch de origem `feature/ae-atendimento-inteligente-multicliente-v1`.
5. Revisar o diff. Não fazer merge se houver alterações não relacionadas (TUCXA, Lu, Bazar, etc.).

## Fase 6 — Publicação controlada em produção

**Pré-requisitos antes do merge:**

- Aprovação e controle de acesso dos usuários; backup Supabase; SQL testado em ambiente de homologação.
- Variáveis de produção criadas **antes** do primeiro acesso ao webhook, com `AE_AI_SEND_LIVE=false`.
- Nenhum `ae_ai_channels` ativo ligado ao número principal enquanto a coexistência/migração não estiver validada.
- Separação formal de WABA/Phone Number ID por empresa, com consentimento do titular.
- Operador responsável por atender conversas encaminhadas e acompanhar falhas de entrega.

**Operação:**

```powershell
# Depois do PR aprovado e homologado, usar o merge pelo GitHub.
# Em seguida atualizar a pasta principal SEM sobrescrever alteracoes pendentes:
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema'
git fetch origin --prune
git status -sb
# Apenas se o checkout de main estiver limpo:
git switch main
git pull --ff-only origin main
```

No Supabase de produção executar a mesma migration (se ainda não aplicada), cadastrar administradores e criar os canais **inativos**. No Vercel Production, configurar as variáveis apropriadas.

Publicar com `AE_AI_SEND_LIVE=false` inicialmente, validar login/painel/webhook GET e assinatura POST usando teste controlado.

Somente após aprovação de um número **de teste autorizado**, configurar o canal e `AE_AI_SEND_LIVE=true` no Production e reimplantar. Validar recebimento e envio efetivos no número de teste.

Para colocar o WhatsApp do Anderson em operação, confirmar coexistência/migração e obter autorização. Atualizar o `phone_number_id` do canal RMC para o **número certo** e o token correspondente após janela de manutenção acordada. Habilitar gradualmente, monitorando a resposta automática e o atendimento humano. A Piloto só deve ser ativada depois de confirmar suas credenciais e responsável.

**Rollback seguro de incidentes:**

```sql
update public.ae_ai_organizations set automation_enabled=false
where slug in ('reparos-rmc','piloto-automotivo');
-- Ou desativar um canal especifico:
update public.ae_ai_channels set active=false
where phone_number_id='<PHONE_NUMBER_ID>';
```

Depois, se necessário, desmarcar `AE_AI_SEND_LIVE` em Vercel e fazer rollback da implantação. **Não apagar tabelas** sem plano de migração dos dados; manter evidências de mensagens já recebidas. A interrupção da automação não substitui o processo de desconexão do número na Meta.

## Indicadores a acompanhar

- Quantidade de conversas novas e pedidos completos de triagem.
- Solicitações por segmento e urgência.
- Volume transferido para atendimento humano.
- Quantidade de saídas `sent`, `simulated`, `failed`, `unknown`.
- Tempo até resposta humana e redução da sobrecarga do Anderson.

## Limitações atuais e critérios de não publicação

**Não publicar com envios reais** se houver: SQL não validado, erro de `npm run build`, falta de token apropriado, onboarding Meta incompleto, risco de envio no Preview, isolamento multiempresa não comprovado ou ausência de monitoramento humano. Este pacote não foi compilado com a totalidade das dependências e tampouco testado contra um banco Supabase/Meta reais no ambiente que o gerou; execução dos testes locais e homologação é obrigatória.
