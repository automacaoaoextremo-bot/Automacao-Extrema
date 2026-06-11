# Corrente em Dia — Ajustes de cabeçalho, login e painel do cliente

## O que foi ajustado

1. Nas páginas **Quero Conhecer** e **Já sou Cliente**, o botão **← Voltar** foi movido para a primeira linha do cabeçalho, sem quebrar o texto **Corrente em Dia**.
2. O botão **← Voltar** agora tem fundo verde e maior destaque visual.
3. A tela **Já sou Cliente** deixou de exibir informações de manual/teste na área pública.
4. A tela **Já sou Cliente** passou a explicar a diferença entre:
   - **responsável da organização**, que vê a visão geral da organização, aprovações e relatórios;
   - **contribuinte**, que vê somente suas próprias contribuições, comprovantes e histórico.
5. O texto público de orientação de senha foi substituído por um botão **Esqueci minha senha**.
6. O botão **Esqueci minha senha** envia um link de redefinição pelo Supabase Auth para o e-mail informado.
7. Se o usuário abrir um link de recuperação de senha do Supabase, a página exibe o formulário para criar nova senha.
8. Na área do cliente logado, o botão **Sair** foi movido para a primeira linha do cabeçalho.
9. O botão **Página pública** foi removido da área logada.
10. A área logada agora mostra um card de **Tipo de acesso**, diferenciando visão de responsável e visão de contribuinte.

## Como os perfis são diferenciados

A diferenciação acontece a partir das tabelas do Corrente em Dia:

- `ced_people`: pessoa cadastrada.
- `ced_roles`: função exercida, como presidente, tesoureiro, cambono, médium, consulente contribuinte ou família contribuinte.
- `ced_person_organizations`: vínculo entre pessoa e organização, com campos como `is_manager`, `is_financial_responsible` e `contribution_enabled`.

A regra usada no painel é:

- se a pessoa tiver `is_manager = true`, `is_financial_responsible = true`, função gestora ou função financeira, ela vê a **visão da organização**;
- caso contrário, ela vê a **visão individual**, restrita às próprias contribuições.

## Dados fictícios recomendados para testes

Crie usuários no Supabase Authentication com estes e-mails e uma senha de teste, por exemplo `Teste@123456`.

| E-mail | Perfil esperado | O que testar |
|---|---|---|
| `rita.menezes@exemplo.com` | Responsável / tesoureira | Visão da organização e condições comerciais do cliente. |
| `paulo.nogueira@exemplo.com` | Responsável / presidente | Visão de associação vinculada. |
| `maria.santos@exemplo.com` | Contribuinte individual | Visão individual com contribuição aprovada. |
| `joao.almeida@exemplo.com` | Contribuinte individual | Visão individual com comprovante enviado/pré-validado. |
| `ana.lima@exemplo.com` | Consulente contribuinte | Visão individual com contribuição eventual. |
| `carlos.oliveira@exemplo.com` | Família contribuinte | Visão de contribuição familiar. |
| `fernanda.oliveira@exemplo.com` | Família contribuinte | Visão de membro familiar. |

A área do cliente tenta localizar a pessoa pelo `auth_user_id`. Se ainda não estiver vinculado, ela também tenta localizar pelo e-mail do usuário autenticado. Para teste, basta criar o usuário no Supabase Auth com o mesmo e-mail fictício.

## Como criar usuário de teste no Supabase

1. Acesse o painel do Supabase.
2. Vá em **Authentication > Users**.
3. Clique em **Add user** ou **Create new user**.
4. Informe um dos e-mails fictícios acima.
5. Defina a senha, por exemplo `Teste@123456`.
6. Marque o e-mail como confirmado, se a opção estiver disponível.
7. Salve.
8. Acesse `/solucoes/corrente-em-dia/login`.

## Redefinição de senha

Para o botão **Esqueci minha senha** funcionar corretamente, verifique no Supabase:

1. Em **Authentication > URL Configuration**, confirme se a URL do site está correta.
2. Em ambiente local, o redirect pode usar `http://localhost:3000/solucoes/corrente-em-dia/login`.
3. Em produção, use `https://www.automacaoextrema.com/solucoes/corrente-em-dia/login`.
4. O usuário informa o e-mail na tela de login e clica em **Esqueci minha senha**.
5. O Supabase envia o link de recuperação.
6. Ao abrir o link, a tela permite criar uma nova senha.

## SQL

Esta atualização não exige SQL novo, desde que os SQLs anteriores já tenham sido executados:

```txt
supabase/sql/20260611_01_cadastro_solucao_corrente_em_dia.sql
supabase/sql/20260611_02_base_corrente_em_dia.sql
supabase/sql/20260611_03_seed_corrente_em_dia_dados_fakes.sql
supabase/sql/20260611_04_condicoes_cliente_fundador_corrente_em_dia.sql
```

## Atualização local

Na pasta do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Faça backup:

```powershell
Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-ajustes-auth-header-corrente.zip -Force
```

Extraia o ZIP atualizado por cima da pasta atual.

Depois rode:

```powershell
npm run lint
npm run build
npm run dev
```

## Páginas para validar localmente

```txt
http://localhost:3000/solucoes/corrente-em-dia
http://localhost:3000/solucoes/corrente-em-dia/quero-conhecer
http://localhost:3000/solucoes/corrente-em-dia/login
http://localhost:3000/solucoes/corrente-em-dia/cliente
http://localhost:3000/c/casa-pai-benedito-das-matas
```

## Roteiro de teste rápido

1. Acesse `/solucoes/corrente-em-dia/quero-conhecer` e confira se **← Voltar** aparece no cabeçalho, sem quebrar o nome da solução.
2. Acesse `/solucoes/corrente-em-dia/login` e confira se **← Voltar** aparece no cabeçalho.
3. Na tela de login, informe o e-mail e clique em **Esqueci minha senha** para validar a mensagem de recuperação.
4. Crie o usuário `rita.menezes@exemplo.com` no Supabase Auth.
5. Faça login com esse usuário e confirme a visão de responsável.
6. Saia pelo botão **Sair** no cabeçalho.
7. Crie o usuário `maria.santos@exemplo.com` no Supabase Auth.
8. Faça login e confirme a visão individual de contribuinte.

## Atualizar GitHub

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

git status
npm run lint
npm run build

git add .
git commit -m "Ajusta login e cabecalho do cliente Corrente em Dia"
git push origin main
```

Se sua branch principal for `master`:

```powershell
git push origin master
```

## Atualizar Vercel

Se o projeto da Vercel está conectado ao GitHub, o deploy deve iniciar automaticamente após o `git push`.

Valide em produção:

```txt
https://www.automacaoextrema.com/solucoes/corrente-em-dia
https://www.automacaoextrema.com/solucoes/corrente-em-dia/quero-conhecer
https://www.automacaoextrema.com/solucoes/corrente-em-dia/login
https://www.automacaoextrema.com/solucoes/corrente-em-dia/cliente
```

Se precisar forçar deploy:

```powershell
npx vercel --prod
```
