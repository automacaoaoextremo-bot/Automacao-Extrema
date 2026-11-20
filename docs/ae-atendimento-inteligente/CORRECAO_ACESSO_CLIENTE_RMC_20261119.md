# AE Atendimento Inteligente – Correção de acesso cliente RMC / piloto individual

**Branch**: `feature/ae-atendimento-inteligente-multicliente-v1`  
**ZIP fonte de referência**: `ae-atendimento-inteligente-acesso-rmc-fontes-20261119-184310-508.zip`  
**Commit fonte indicado no manifesto**: `5afa2fcdc868c23b0cd98bc0a7c082fdb4fc23a4`  

## Diagnóstico do CSV SQL recebido

- Existe conta Supabase Auth, com e-mail confirmado.
- O usuário **não possui papel N1/N2** na Reparos RMC, nem administrador global.
- Existe cadastro RMC como cliente.
- `portal_enabled=false`, `phone_verified_at` não preenchido e `must_change_password=true`.
- Em `customer-auth.ts`, o portal só é considerado ativo se `portal_enabled=true` **e** `phone_verified_at` tiver um valor.
- `rmc-login-form.tsx` efetua logout e exibe a mensagem após o login Auth, quando o portal não está ativo. A senha incorreta não explica este erro.
- Isso está alinhado à transição de N1 anterior para cliente prevista nos Ajustes 15, que deliberadamente deixou o portal bloqueado.

**A liberação de uma conta é ato administrativo.** Não assumir que a pessoa deva voltar a ser operador N1. Não alterar contas de outras empresas.

## Conteúdo do pacote

- `src/lib/atendimento-inteligente/customer-auth.ts`: centraliza autorização de piloto por UID, depois da ativação e da troca de senha.
- `src/app/api/atendimento-inteligente/actor/route.ts`: informa `canSubmitRequest` de acordo com a mesma regra do backend.
- `src/app/api/atendimento-inteligente/requests/route.ts`: aplica a regra também na criação de pedidos; não basta alterar o front-end.
- `src/components/atendimento-inteligente/rmc-login-form.tsx`: mensagem de bloqueio mais clara.
- `private_sql/00...sql`: conferência somente leitura.
- `private_sql/01...sql`: liberação individual **com travas e confirmação de identidade/WhatsApp**.
- `private_sql/02...sql`: revogação individual do portal, se necessário.
- `02_ARQUIVOS_IMPLEMENTACAO.json`: hashes originais e novos.

**Não houve alteração de esquema; nenhuma migration SQL é necessária.** Os SQLs privados são atualização de dados e não devem entrar em GitHub, migrations ou pastas públicas.

## Etapa 1 – Preparar os arquivos localmente

Salvar o ZIP em `C:\Users\lacos\Documents\zips` e o instalador em `C:\Users\lacos\Documents\scripts`.

```powershell
$Repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$Scripts = 'C:\Users\lacos\Documents\scripts'
$Zips = 'C:\Users\lacos\Documents\zips'
cd $Repo
git worktree list
git branch --show-current
git status -sb
git rev-parse HEAD
```

A branch esperada é exatamente `feature/ae-atendimento-inteligente-multicliente-v1`.

Simulação de instalação (sem alterar arquivos):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$Scripts\Instalar-AE-Atendimento-Inteligente-Correcao-Acesso-RMC.ps1" `
  -RepoRoot "$Repo" `
  -ZipPath "$Zips\AE-Atendimento-Inteligente-Correcao-Acesso-RMC-IMPLEMENTACAO.zip" `
  -BackupRoot "$Zips" `
  -DryRun
```

Se não houver conflito de hash/branch:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$Scripts\Instalar-AE-Atendimento-Inteligente-Correcao-Acesso-RMC.ps1" `
  -RepoRoot "$Repo" `
  -ZipPath "$Zips\AE-Atendimento-Inteligente-Correcao-Acesso-RMC-IMPLEMENTACAO.zip" `
  -BackupRoot "$Zips"
```

O instalador cria backup dos arquivos substituídos. Ele **não** altera SQL, Git nem variáveis do Vercel. Em caso de hash diferente da coleta, não use força: investigue as mudanças locais. O ZIP possui um arquivo de documentação novo (sem hash anterior).

## Etapa 2 – Teste estático e local

```powershell
cd $Repo
node --version  # o package.json exige 24.x
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Acesse `http://localhost:3000/solucoes/atendimento-inteligente/rmc/entrar`. O login de cliente bloqueado deve continuar bloqueado até aprovação, com a mensagem correta. Teste N1 e N2 em contas de homologação: suas funções permanecem inalteradas.

## Etapa 3 – Homologação segura do acesso do cliente

1. Usar **Supabase de homologação**, com cliente de teste e número verificável. Não testar alterações de dados na Production por meio do Preview.
2. Rodar `private_sql/00_CONFERIR_CADASTRO_SEM_ALTERAR.sql`, alterando apenas o e-mail exato.
3. **Confirmar identidade e posse do WhatsApp de forma independente**: o e-mail confirmado não basta. Validar o número real do cadastro RMC; não copiar a data de outra conta, não atualizar `auth.users` diretamente e não inventar verificação.
4. Abrir `private_sql/01_APROVAR_CLIENTE_RMC_APOS_VERIFICAR_IDENTIDADE.sql` no SQL Editor administrativo, informar e-mail e telefone exatos e somente então alterar `v_autorizacao` para `SIM_IDENTIDADE_E_WHATSAPP_CONFERIDOS_PELA_RMC`. Esse SQL falha sem as três entradas, verifica papéis/empresa e só aprova a conta RMC correspondente.
5. Rodar novamente o SQL 00. Esperado: `portal_enabled=true`, `whatsapp_verificado=true`, `must_change_password=true` antes do primeiro acesso.
6. Entrar como cliente. Deve redirecionar obrigatoriamente para `/rmc/trocar-senha`; após troca, `must_change_password=false`. A senha digitada na captura de tela deve ser substituída.
7. Confirmar que a conta cliente não acessa telas e APIs de operador N1/N2.
8. Habilitar **somente no Preview** `AE_AI_RMC_CUSTOMER_PILOT_USER_IDS` com o UID Auth da **conta de teste**, obtido no diagnóstico. Manter `AE_AI_CUSTOMER_REQUESTS_ENABLED=false` se a intenção for habilitar apenas o piloto. Fazer novo deploy do Preview para aplicar variável.
9. Confirmar que `/api/atendimento-inteligente/actor` retorna `canSubmitRequest=true` apenas ao cliente aprovado e incluído no piloto. Sem estar no piloto, o cliente pode acessar o portal mas não criar o pedido.
10. Como cliente piloto, cadastrar uma solicitação de teste com categoria **Vazamentos** ou **Telhado**, endereço, consentimento e uma foto JPEG/PNG, conferindo protocolo, gravação no banco e acesso somente aos próprios pedidos.
11. Testar um segundo cliente sem UID na variável e confirmar `403` em POST de solicitação; testar operador N1 e N2 para regressão. **Nunca** colocar UID de cliente real no ambiente de homologação usando um banco diferente, nem copiar dados pessoais entre ambientes.
12. Testar revogação via SQL 02 em um cadastro de teste. Confirmar que o portal volta a bloquear acesso, sem exclusão de dados.

**Mídia:** os 7 áudios WhatsApp `.ogg` fornecidos não são aceitos por `MEDIA_TYPES` nesta versão. Não tente renomeá-los para MP4. A fotografia pode ser JPEG/PNG/WebP com até 5 MB, no limite de três imagens. Inclusão de áudio requer evolução separada de API/bucket/UI.

## Etapa 4 – GitHub (somente código e documentação)

```powershell
cd $Repo
git branch --show-current
git status -sb
git diff --check
git diff --cached --name-only

git add -- src/lib/atendimento-inteligente/customer-auth.ts
git add -- src/app/api/atendimento-inteligente/actor/route.ts
git add -- src/app/api/atendimento-inteligente/requests/route.ts
git add -- src/components/atendimento-inteligente/rmc-login-form.tsx
git add -- docs/ae-atendimento-inteligente/CORRECAO_ACESSO_CLIENTE_RMC_20261119.md

git diff --cached --check
git diff --cached --name-only
git diff --cached

git commit -m "fix(ae): acesso cliente RMC e piloto individual de solicitacoes"
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

Se `git diff --cached --name-only` incluir outros arquivos, retire os estranhos do index antes de commitar. O ZIP fonte registrou alteração local em `src/app/api/atendimento-inteligente/my/requests/route.ts`: **não substituir nem incluir nesse commit**. Não usar `git add -A`, `git reset --hard` ou `git clean`.

## Etapa 5 – Preview e Production

1. Verificar no Vercel Preview que o deployment corresponde ao commit, Node 24 e Supabase isolado de homologação.
2. Fazer os testes acima. Confirmar que a flag global `AE_AI_CUSTOMER_REQUESTS_ENABLED` **não** está ativada acidentalmente: se estiver true, o comportamento legado permite qualquer cliente ativo solicitar, não somente quem está na lista piloto. Alterar flag pode afetar clientes já existentes, por isso requer revisão antes.
3. Após aprovação, em Production: **backup do Supabase**, conferência do projeto e da identidade, execução do SQL 00 (leitura), verificação independente de titularidade e então SQL 01 (única conta). Não executar SQL de teste em Production.
4. No Vercel Production, configurar `AE_AI_RMC_CUSTOMER_PILOT_USER_IDS` com apenas o UID verificado dessa conta **no Auth da produção**. Deixar `AE_AI_CUSTOMER_REQUESTS_ENABLED=false` para piloto restrito, desde que isso não altere uma operação já existente. As variáveis precisam de novo deployment para passar a valer.
5. Revisar todos os commits pendentes no PR branch -> `main`; pode haver Ajustes 17/18/19 não integrados. Só fazer merge se o conjunto inteiro estiver homologado. Conferir `origin/main...HEAD` e deployments.
6. Após deploy, efetuar login, trocar senha, enviar **um** pedido real autorizado com foto e validar protocolo, visibilidade para N2, acesso apenas ao próprio pedido e mensagens automáticas desabilitadas até avaliação. Não reprocessar o mesmo formulário se a resposta do upload falhar: confira protocolo para evitar duplicação.
7. Se o problema for só dados/permissões no ambiente existente, é possível liberar o portal **sem publicação de código** após verificação independente da identidade; porém o piloto individual para envio depende do código deste pacote publicado e da variável no ambiente.

## Reversão

- Retirar o UID de `AE_AI_RMC_CUSTOMER_PILOT_USER_IDS` no Vercel, redeploy e conferir `canSubmitRequest=false` para esse cliente (se flag global estiver false).
- Se necessário bloquear o portal, rodar SQL 02 após conferir identidade. Não apagar clientes, requests nem marcar telefone não verificado sem investigação.
- Reverter código via Pull Request / redeploy anterior. Sem migration nova para reverter.
