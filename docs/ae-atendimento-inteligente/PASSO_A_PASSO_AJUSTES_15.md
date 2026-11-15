# AE Atendimento Inteligente — Ajustes 15

**Escopo:** retirar o botão “Voltar” da tela de solicitação autenticada e o texto instrutivo riscado; validar o N2 Anderson; habilitar novo N1 da Automação Extrema; somente após teste, converter N1 anterior em cliente RMC.  
**Branch:** `feature/ae-atendimento-inteligente-multicliente-v1`  
**Fonte:** ZIP `ae-atendimento-inteligente-ajustes-15-fontes-20261114-214152.zip`, HEAD local nele registrado como `d789c0c6fa7fd94ce980e800449440c92dbd82db`.

## 1. Situação encontrada

O CSV do diagnóstico fornecido apresenta **dois vínculos RMC**: o N1 anterior é `operator` e Anderson é `owner`. O CSV não apresenta o novo N1. Esse arquivo não comprova se as contas estão com telefones cadastrados/confirmados nem se possuem privilégios globais na AE.

Nenhuma conta, senha, telefone ou permissão foi alterada durante a preparação do pacote. As consultas e as alterações de banco ainda precisam ser executadas na instância correta do Supabase.

## 2. Conteúdo

| Caminho | Finalidade |
|---|---|
| `src/app/solucoes/atendimento-inteligente/rmc/solicitar/page.tsx` | Oculta o botão Voltar quando existe sessão, preservando o menu Sair. Na tela sem sessão, a navegação para login mantém o Voltar. |
| `src/components/atendimento-inteligente/request-form.tsx` | Remove apenas o texto instrutivo indicado no documento 15. |
| `docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_15.md` | Este guia, único documento do pacote a copiar para o repositório. |
| `private_sql/00_...sql` a `private_sql/04_...sql` | Diagnóstico e transição de papéis, **privados: nunca copiar para GitHub ou expor em uma URL pública**. |
| `INSTALAR_AE_ATENDIMENTO_AJUSTES_15.ps1` | Instalador local com verificação de branch e backup, **não executa SQL**. |

A implementação visual **não exige uma nova migration**; aproveita o esquema até a migration dos Ajustes 14. Os SQLs de transição alteram somente dados de autorização/cadastro comercial quando autorizados.

## 3. Backup e instalação local

1. No PowerShell, confirme a branch e preserve alterações:

```powershell
$repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
cd $repo
git status -sb
git branch --show-current
git worktree list
git fetch origin --prune
```

2. Salve o ZIP em `C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-15-IMPLEMENTACAO.zip` e o instalador `.ps1` em `C:\Users\lacos\Documents\scripts\INSTALAR_AE_ATENDIMENTO_AJUSTES_15.ps1`.
3. Execute sem `-AllowModifiedFiles`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File 'C:\Users\lacos\Documents\scripts\INSTALAR_AE_ATENDIMENTO_AJUSTES_15.ps1' `
  -RepoPath 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento' `
  -ZipPath 'C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-15-IMPLEMENTACAO.zip'
```

Se acusar arquivo modificado, examine `git diff -- <caminho>`. O instalador só aceita sobrescrever com `-AllowModifiedFiles` depois de conferência, criando backup dos arquivos-alvo no diretório `zips`. O SQL privado não é instalado no projeto.

4. Confirme o diff e execute as validações com **Node 24.x**:

```powershell
cd $repo
git diff --stat
git diff --check
node --version
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Não avance diante de erro ou warning não explicado.

## 4. Testes de interface

- Entre como N1 na página `/solucoes/atendimento-inteligente/rmc/solicitar` e confirme que aparecem o nome resumido e **Sair**, mas não o **Voltar** do cabeçalho.
- Confira que o parágrafo “Preencha cada etapa pelo botão correspondente...” não aparece.
- Abra e feche as três etapas; teste a seleção de cliente, vários serviços, endereço existente, fotos opcionais e envio controlado.
- No celular, confira rolagem, teclado e foco dos modais.
- Faça logout e confirme que o login da RMC ainda abre e que a navegação de outras páginas não foi alterada.
- Entre como N2 e confirme abertura da fila e dos orçamentos. Não ativar envios automáticos.

## 5. Alterações de acesso: DUAS FASES, não executar no mesmo passo

**Atenção:** o arquivo CSV enviado informa apenas os papéis `operator` (N1 anterior) e `owner` (Anderson). Ele não confirma o novo N1 no Auth. A instância Supabase mostrada anteriormente estava em Production; confirme a instância antes de qualquer operação. Preferir homologação isolada.

### 5.1 Diagnóstico sem modificações

Abra `private_sql/00_DIAGNOSTICO_IDENTIDADES_E_PAPEIS.sql` no SQL Editor do Supabase, usando um papel administrativo autorizado, normalmente `postgres`. Confirme os UIDs, e-mails, telefones, `phone_confirmed_at` e a tabela `ae_ai_platform_admins`.

**Nunca** execute `GRANT SELECT ON auth.users TO authenticated` para contornar erros 42501. Se a consulta falhar por permissões, corrija o papel de execução do SQL Editor antes de continuar.

### 5.2 Criar/verificar novo N1

No Supabase Auth, confirme a existência de uma **conta distinta** da Automação Extrema, com e-mail verificado, senha particular e titularidade controlada. Se não existir, crie-a pela interface administrativa. O número informado para essa conta poderá ser associado e confirmado por fluxo seguro via API Admin, separadamente; este pacote não modifica diretamente `auth.users`.

Execute `private_sql/01_AUTORIZAR_NOVO_N1_APOS_CRIAR_CONTA.sql`. O script procura o novo N1 pelo e-mail exato, evita identidade duplicada, confere eventual telefone conflitante e cria o vínculo `operator` **somente na RMC**.

**Teste obrigatoriamente** com a conta nova: login, cadastro de cliente, criação de solicitação, consulta da lista, encerramento de sessão. Somente depois avance para a fase 2.

### 5.3 Conferir Anderson N2

Execute `private_sql/02_VERIFICAR_ANDERSON_N2.sql`. O CSV anterior já confirma o papel `owner`, portanto **não é necessário refazer esse vínculo** se ainda estiver correto. Caso o campo `phone` esteja vazio, o login por e-mail e senha poderá funcionar, mas o login por número depende de associar e **verificar** o telefone no Auth, além da configuração do provedor Phone.

Para alterações administrativas de telefone, utilize a API `auth.admin.updateUserById` do Supabase em contexto seguro de servidor, após confirmar o número com o titular. Não altere diretamente tabelas `auth.*`; não exponha a chave `service_role` no navegador ou no repositório.

### 5.4 Converter N1 anterior em cliente RMC

Somente após testes da nova conta, backup e autorização expressa, revise `private_sql/03_CONVERTER_N1_ANTIGO_EM_CLIENTE_FASE_2.sql` e mude a trava `v_autorizacao` para o valor indicado no arquivo.

A operação identifica a conta anterior pelo UID/e-mail, procura o contato da RMC por WhatsApp normalizado, não substitui outra identidade Auth, cria ou ajusta o cadastro comercial com portal **bloqueado**, e remove exclusivamente o vínculo `operator` anterior **dentro da RMC**. Não modifica contas em outras empresas.

**Bloqueio proposital:** se a conta anterior constar em `ae_ai_platform_admins`, o SQL interrompe a operação: o código atual ainda considera administradores globais como operadores da RMC. Não remova privilégios globais sem analisar acessos AE a outras empresas/soluções. Nesse caso, é necessária uma mudança de escopo na aplicação antes de concluir a conversão.

Execute depois `private_sql/04_VALIDACAO_FINAL.sql` e teste novamente os acessos.

O portal do cliente migrado continuará bloqueado nesta fase. Não há redefinição automática de senha, confirmação fictícia de WhatsApp ou liberação de históricos privados.

## 6. GitHub — branch correta

**Os SQLs privados NÃO entram no GitHub.** Após `lint`, TypeScript, build e testes locais aprovados:

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
git branch --show-current
git add -- src/app/solucoes/atendimento-inteligente/rmc/solicitar/page.tsx
git add -- src/components/atendimento-inteligente/request-form.tsx
git add -- docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_15.md
git diff --cached --name-only
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m 'fix(ae): simplifica solicitacao RMC e documenta transicao N1 N2 ajustes 15'
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

Verifique que não foram incluídas alterações locais anteriores, conversas, CSVs, SQLs privados, números de telefone, segredos ou senhas. Se outros arquivos estiverem modificados, preserve-os sem usar `git add -A`.

## 7. Vercel Preview

1. Abra o deployment Preview da branch e confirme que usa **Supabase de homologação**, não Production.
2. Execute o diagnóstico e a fase 1 somente no banco de homologação; confirme o novo N1.
3. Teste o fluxo N1, N2 e cliente com dados de teste autorizados. Não teste contas fictícias em Production.
4. Se o Preview estiver conectado ao banco de produção, **interrompa os testes que escrevem dados**.
5. Conclua a fase 2 em homologação somente se o diagnóstico não detectar administrador global.

## 8. Publicação em Production

1. Faça backup e confirme o Supabase Production e suas migrations até Ajustes 14.
2. Revise o Pull Request completo para `main` (não apenas este commit) e execute os testes de regressão da AE e demais soluções.
3. Faça o merge após aprovação e acompanhe o deployment Vercel Production.
4. Confira somente a interface no primeiro momento: botão Voltar ausente em N1, parágrafo removido, demais telas funcionando.
5. Na Production, execute **diagnóstico 00**, confirme Anderson `owner`, crie/verifique a conta nova, aplique **fase 1 (01)** e teste uma solicitação controlada com a conta da AE.
6. Somente depois de validação real e backup, execute a **fase 2 (03)** se não houver conflito com privilégios globais; finalize com **validação 04**.
7. Confirme que o N1 antigo não tem mais autorização de operador na RMC e que o cadastro comercial do cliente está preservado e sem portal ativo. Se o SQL bloquear por `platform_admins`, não force a operação.

**Rollback:** para a interface, reverter o commit por PR ou retornar ao deployment Vercel anterior. Para permissões, usar o backup e uma transação de recuperação revisada por administrador; não simplesmente reatribuir papéis sem verificar que usuários e clientes permanecem corretos. Não aplicar reversão automática de esquema.

## 9. Status das verificações deste pacote

- ZIP original analisado e CSV de dois vínculos lido.
- Alterações visuais limitadas a dois componentes, sem migration adicional.
- SQLs de diagnóstico, autorização, verificação e conversão gerados mas **não executados**.
- Sintaxe TSX verificada com parser TypeScript; não foram executados `npm ci`, lint, build ou testes reais em Supabase/Vercel neste ambiente.
