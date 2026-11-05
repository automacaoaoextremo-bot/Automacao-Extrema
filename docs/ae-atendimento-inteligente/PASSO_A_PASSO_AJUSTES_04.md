# AE Atendimento Inteligente — Ajustes 04 | Fase 0 | 05/11/2026

## 1. O que este pacote entrega

- Cabeçalho RMC padronizado com logo, faixa AE, navegação sem botão "Conheça" e ações adequadas à sessão.
- Landing com modais de benefícios e botão "Fechar"; sem mencionar profissional ou níveis de atendimento em páginas públicas.
- Cadastro **assistido** de cliente por operador AE/RMC autorizado: nome, WhatsApp, e-mail opcional, **senha individual forte**, sem armazenar senha no banco de negócios.
- Cliente vinculado ao contato por telefone E.164, dentro da organização, evitando confusão entre nomes homônimos.
- Acesso inicial do cliente **bloqueado** até verificação do telefone e ativação individual; a senha fica marcada para troca obrigatória quando o portal for liberado.
- Login único para operador (e-mail) e cliente (telefone + senha), com roteamento por papel e API autorizada por empresa.
- Formulário mobile em três etapas: até cinco serviços, dados específicos, descrição, fotos/vídeo opcionais, CEP/endereço obrigatório e reutilização de endereços existentes.
- Fila de pedidos com filtro de status e ordenação por data/prioridade; novos status preservando históricos e estados de orçamento independentes.
- Endpoint de CEP via ViaCEP com preenchimento manual como alternativa.
- Portal do cliente e troca de senha estruturados, mas **não liberados para clientes reais** nesta fase.
- Orçamentos e WhatsApp continuam manuais. Nenhum disparo automático é ativado.

## 2. Segurança: decisão de acesso

A proposta de uma senha padrão compartilhada no momento da liberação foi **substituída por senhas temporárias diferentes por cliente**, com troca no primeiro acesso. Usar o mesmo segredo para todos exporia os pedidos e endereços. Nesta Fase 0, o operador define uma senha inicial específica para cada cliente, e o backend cria a conta Supabase Auth com `phone_confirm=false` e `portal_enabled=false`.

**Importante:** criar a conta NÃO confirma a posse do telefone. A liberação real depende de verificar a identidade e o número por canal confiável. O pacote não inclui ainda o fluxo administrativo de verificação/ativação nem o envio de novas credenciais por SMS/WhatsApp. Portanto, NÃO abra o acesso de clientes em produção agora. Esse processo será uma evolução separada.

## 3. Preparar worktree, sem destruir alterações

```powershell
$repo   = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$branch = 'feature/ae-atendimento-inteligente-multicliente-v1'
cd $repo
$actual = git branch --show-current
if ($actual -ne $branch) { throw "Branch errada: $actual" }
git status -sb
git worktree list
git fetch origin --prune
```

Se houver arquivos locais modificados, faça cópia ou commit específico. **Não rode** `git reset --hard` nem altere o worktree do TUCXA.

## 4. Backup e extração

Copie `AE-Atendimento-Inteligente-Ajustes-04-IMPLEMENTACAO.zip` para `C:\Users\lacos\Documents\zips` e execute:

```powershell
$repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$zip  = 'C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-04-IMPLEMENTACAO.zip'
$backup = "C:\Users\lacos\Documents\zips\backup-ae-ai-04-$(Get-Date -Format yyyyMMdd-HHmmss)"
New-Item -ItemType Directory -Force $backup | Out-Null
Copy-Item "$repo\src\components\atendimento-inteligente" "$backup\componentes" -Recurse -Force
Copy-Item "$repo\src\app\api\atendimento-inteligente\requests\route.ts" "$backup\requests-route.ts" -Force
Expand-Archive -LiteralPath $zip -DestinationPath $repo -Force
cd $repo
git status -sb
git diff --check
```

O pacote contém arquivos novos e completos em seus caminhos corretos. Não contém o projeto todo, nem um arquivo `.env`.

## 5. Migration no Supabase de homologação

1. Confirme o backup do projeto e as migrations anteriores:
   - `20261103180000_ae_atendimento_inteligente_v1.sql`
   - `20261104173000_ae_atendimento_inteligente_ajustes_02.sql`
   - `20261105090000_ae_atendimento_inteligente_ajustes_03.sql`
2. Execute `supabase/migrations/20261105170000_ae_atendimento_inteligente_ajustes_04.sql` no SQL Editor **de homologação**.
3. Execute a consulta abaixo e confirme que as organizações estão desativadas para automação:

```sql
select slug, public_intake_enabled, automation_enabled
from public.ae_ai_organizations
where slug in ('reparos-rmc','piloto-automotivo');

select table_name from information_schema.tables
where table_schema='public' and table_name in
('ae_ai_customers','ae_ai_customer_addresses','ae_ai_request_items')
order by table_name;

select column_name from information_schema.columns
where table_schema='public' and table_name='ae_ai_requests'
and column_name in ('customer_id','address_id');
```

Resultados esperados: duas empresas com `false` para os dois indicadores, três tabelas criadas e duas colunas adicionadas. Verifique também a existência da RPC `ae_ai_register_request_v4`.

## 6. Variáveis locais (somente servidor onde aplicável)

No arquivo `$repo\.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=CHAVE_PUBLICA
SUPABASE_SERVICE_ROLE_KEY=CHAVE_PRIVADA
AE_AI_PUBLIC_REQUESTS_ENABLED=false
AE_AI_CUSTOMER_REQUESTS_ENABLED=false
AE_AI_SEND_LIVE=false
```

Não copie segredos para o chat, ZIP ou GitHub. A chave `SUPABASE_SERVICE_ROLE_KEY` jamais pode usar prefixo `NEXT_PUBLIC_`.

A consulta ViaCEP depende de acesso externo; se indisponível, o usuário preenche os campos de endereço manualmente. Para teste de login com telefone, a configuração de autenticação por telefone no Supabase deverá estar habilitada e a posse do número ser verificada; não considere `phone_confirm=false` uma conta liberada.

## 7. Verificação local

Utilize Node.js 24.x (conforme `package.json`).

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
node --version
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Se qualquer etapa falhar, **interrompa a publicação** e envie o log da falha, sem credenciais.

## 8. Homologar funcionalmente, com dados de TESTE

1. Faça login como operador autorizado em `/solucoes/atendimento-inteligente/rmc/entrar`.
2. Abra `/rmc/cadastro` e crie um cliente de teste com telefone próprio autorizado e senha exclusiva. Confira que a API não retorna senha e o registro fica `portal_enabled=false`, `must_change_password=true`.
3. Abra `/rmc/solicitar`, selecione esse cliente e informe dois tipos de serviços, detalhes e descrição.
4. Avance, teste o upload de uma imagem pequena e, se desejar, um vídeo dentro dos limites. Confirmar que a mídia fica privada.
5. No endereço, teste CEP existente, CEP inválido, falha do ViaCEP com preenchimento manual e reutilização de endereço em um segundo pedido (recarregue para atualizar a lista).
6. Confira no painel `/rmc/atendimento` que o pedido está visível, com descrição de vários serviços e o endereço correto.
7. Confirme filtro por status, ordenação por data e prioridade, mudança de status com histórico e visualização dos anexos.
8. Faça orçamento manual, teste validade, duas ou três datas, cópia/envio manual e aceite/recusa. **Abrir link WhatsApp não comprova envio**.
9. Teste com outro operador sem membership e com usuário de outra empresa; ambos devem ser impedidos de acessar RMC.
10. Confira telas públicas sem menção ao nome do profissional/níveis de atendimento e teste no celular com teclado, zoom e rolagem quando necessária.
11. Confira que a área do cliente real continua indisponível, o bot não envia mensagens e o WhatsApp Business atual segue intacto.

## 9. Commit e push (somente com testes aprovados)

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
if ((git branch --show-current) -ne 'feature/ae-atendimento-inteligente-multicliente-v1') { throw 'Branch incorreta!' }
git add -A -- src/app/solucoes/atendimento-inteligente/rmc
 git add -A -- src/components/atendimento-inteligente
 git add -A -- src/app/api/atendimento-inteligente
 git add -A -- src/lib/atendimento-inteligente
 git add -A -- docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_04.md
 git add -A -- supabase/migrations/20261105170000_ae_atendimento_inteligente_ajustes_04.sql
git diff --cached --name-only
git diff --cached --check
git commit -m 'feat(ae): cadastro RMC, enderecos e fluxo multisser v4'
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

*Revise todo o diff preparado antes de fazer o commit. Nunca use `git add .` sem conferir, principalmente se existirem outras alterações locais.*

## 10. Vercel Preview e produção

1. No Vercel, abra o Preview da branch e configure o banco de **homologação**, com `AE_AI_PUBLIC_REQUESTS_ENABLED=false`, `AE_AI_CUSTOMER_REQUESTS_ENABLED=false`, `AE_AI_SEND_LIVE=false`.
2. Execute a homologação do item 8 no Preview, em navegador e dispositivo móvel.
3. Antes de produção, faça backup do Supabase Production e aplique a migration nesse banco somente depois dos testes do Preview.
4. Garanta as variáveis em Production, com os três indicadores ainda `false`.
5. Abra PR `feature/ae-atendimento-inteligente-multicliente-v1` → `main`, revise diff, build, mudanças compartilhadas e impactos em TUCXA, Bazar e Memórias; então faça merge.
6. Verifique as URLs públicas e privadas no domínio principal e repita testes de login, cadastro assistido, pedido, orçamento e permissões. Use dados de teste para não enviar mensagens indevidas.
7. **Mantenha o cadastro público anônimo, acesso de clientes reais e envios da Cloud API desligados** até concluir o processo de ativação individual e sua homologação.

## 11. Reversão e recuperação

- Em caso de falha de interface, promova o último deployment aprovado no Vercel ou reverta o commit via `git revert` (não use `git reset --hard` em branches compartilhadas).
- Mantenha os três indicadores de envio/cadastro desligados.
- A migration adiciona tabelas/colunas. Não remova tabelas com dados reais automaticamente; restaure o backup apenas com plano de recuperação validado.
- Um cliente criado na Fase 0 não tem acesso ao portal até verificação de identidade e liberação individual; sua senha nunca deve ser reutilizada por outra pessoa.

## 12. Critério final de aceite

O operador consegue cadastrar um cliente com senha individual **sem liberá-lo**, registrar um pedido com múltiplos serviços e endereço completo, acompanhar no painel e elaborar orçamento manual. Cliente real, bot e envio automático continuam desativados. O sistema existente do TUCXA permanece intocado.
