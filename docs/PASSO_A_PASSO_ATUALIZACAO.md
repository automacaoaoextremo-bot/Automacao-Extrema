# Automação Extrema — passo a passo de atualização

## 1. Backup

Antes de substituir arquivos, faça commit ou backup da versão atual.

```powershell
git status
git add .
git commit -m "backup antes da gestao ae auth funil relatorios"
```

## 2. Substituir arquivos

Descompacte este zip na raiz do projeto `automacao-extrema`, substituindo os arquivos existentes.

## 3. Instalar dependências

```powershell
npm install
```

Foi incluída a dependência `nodemailer` para envio do e-mail imediato do diagnóstico.

## 4. Rodar SQL no Supabase

No Supabase, acesse **SQL Editor > New query** e rode o arquivo:

```text
supabase/sql/20260527_ae_auth_funil_relatorios.sql
```

Este SQL adiciona:

- campos de funil em `ae_leads`;
- tabela `ae_lead_followups`;
- índices;
- policies para usuários autenticados;
- views de relatório.

## 5. Criar usuário de gestão no Supabase Auth

No Supabase:

1. Acesse **Authentication > Users**.
2. Clique em **Add user**.
3. Informe o e-mail do usuário gestor.
4. Defina uma senha.
5. Marque como confirmado, se a tela mostrar essa opção.

Depois acesse:

```text
http://localhost:3000/login
```

## 6. Atualizar `.env.local`

Garanta estas variáveis no `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY

NEXT_PUBLIC_SITE_URL=http://localhost:3000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=automacao.ao.extremo@gmail.com
SMTP_PASS=SENHA_DE_APP_DO_GMAIL

EMAIL_FROM_NAME=Automação Extrema
EMAIL_FROM=automacao.ao.extremo@gmail.com
EMAIL_COPY_TO=automacao.ao.extremo@gmail.com
EMAIL_NOTIFICATIONS_ENABLED=true
```

Observação: para Gmail, use senha de app, não a senha normal da conta.

## 7. Testar localmente

```powershell
npm run lint
npm run build
npm run dev
```

Páginas principais:

```text
http://localhost:3000/
http://localhost:3000/diagnostico
http://localhost:3000/login
http://localhost:3000/admin/ae
http://localhost:3000/admin/ae/solucoes
http://localhost:3000/admin/ae/relatorios
http://localhost:3000/admin/ae/funil
```

## 8. Publicar no Vercel

1. Faça commit:

```powershell
git status
git add .
git commit -m "feat: gestao ae com auth funil relatorios e validacoes"
git push
```

2. No Vercel, acesse o projeto.
3. Vá em **Settings > Environment Variables**.
4. Cadastre as mesmas variáveis do `.env.local`, exceto `NEXT_PUBLIC_SITE_URL`, que deve ser:

```env
NEXT_PUBLIC_SITE_URL=https://SEU-DOMINIO.vercel.app
```

5. Clique em **Deployments > Redeploy** ou aguarde o deploy automático do push.

## 9. O que foi incluído

- Login real com Supabase Auth.
- Cabeçalho fixo contextual.
- Em páginas públicas: Diagnóstico e Gestão.
- Em páginas logadas: Gestão, Soluções, Relatórios, Funil e Sair.
- Tela de edição de status das soluções.
- Tela de detalhes do lead com respostas completas.
- Relatórios automáticos de dores, áreas, soluções e leads quentes.
- Funil com mensagens prontas de WhatsApp e marcação de envio.
- E-mail imediato para lead + cópia para a Automação Extrema.
- Validação visual no formulário.
- Rolagem automática até a primeira pergunta pendente.
- Validação duplicada na API.
- Bloco explicativo sobre o diagnóstico não solicitar senha, cartão, dados bancários, pagamento, instalação ou download.
- Paleta visual baseada nos logos anexos.
