# Passo a passo — atualização Organização em Harmonia

## Objetivo desta atualização

Esta atualização corrige o fluxo de primeiro acesso da Organização em Harmonia para ficar alinhado ao comportamento já validado no Corrente em Dia:

1. O cadastro `Quero Conhecer` continua com fricção mínima: nome do contato, WhatsApp e e-mail.
2. O lead passa a receber e-mail de **acesso liberado** com:
   - link correto da Organização em Harmonia;
   - e-mail informado no cadastro;
   - senha temporária quando um novo usuário Supabase Auth for criado;
   - orientação para trocar senha no primeiro acesso;
   - orientação para conferir spam/lixo eletrônico.
3. O botão da página Obrigado passa a enviar mensagem da Organização em Harmonia, não do Corrente em Dia.
4. O campo `oh_resp_botconversa` passa a ser preenchido com mensagem da Organização em Harmonia.
5. O mesmo e-mail/WhatsApp pode reenviar o cadastro: o lead, organização, pessoa e campos no BotConversa devem ser atualizados/sobrescritos.
6. Foi criada a página de login:
   `/solucoes/organizacao-em-harmonia/login`

---

## 1. Atualizar projeto local

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Faça backup antes de substituir arquivos:

```powershell
Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-oh-acesso-whatsapp.zip -Force
```

Extraia o ZIP atualizado por cima da pasta atual.

Depois rode:

```powershell
npm run lint
npm run build
npm run dev
```

---

## 2. Rodar SQL no Supabase

No Supabase SQL Editor, rode o arquivo:

```txt
supabase/sql/20260628_15_organizacao_em_harmonia_base_unica.sql
```

Esta versão adiciona compatibilidade para:

```txt
oh_people.auth_user_id
oh_leads.auth_user_id
```

Essas colunas permitem vincular o contato criado no Quero Conhecer ao usuário do Supabase Auth.

Valide com:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('oh_people', 'oh_leads')
  and column_name = 'auth_user_id'
order by table_name, column_name;
```

---

## 3. Verificar variáveis de ambiente

No `.env.local` e na Vercel, confirme:

```env
NEXT_PUBLIC_SITE_URL=https://www.automacaoextrema.com

BOTCONVERSA_ENABLED=true
BOTCONVERSA_API_KEY=...
BOTCONVERSA_API_BASE_URL=https://backend.botconversa.com.br
BOTCONVERSA_API_HEADER_NAME=API-KEY
BOTCONVERSA_AUTH_SCHEME=

BOTCONVERSA_OH_SEND_FLOW=true
BOTCONVERSA_OH_FLOW_ID=ID_REAL_DO_FLUXO_OH_LEAD_VINDO_DO_SITE
BOTCONVERSA_OH_FIELD_RESPONSE_ID=ID_REAL_DO_CAMPO_oh_resp_botconversa
```

Também confirme os IDs reais das etiquetas OH:

```env
BOTCONVERSA_OH_TAG_LEAD_SITE_ID=
BOTCONVERSA_OH_TAG_EMAIL_SENT_ID=
BOTCONVERSA_OH_TAG_FOUNDER_ID=
BOTCONVERSA_OH_TAG_WAITING_ACCESS_ID=
BOTCONVERSA_OH_TAG_AGENDA_VIVA_ID=
BOTCONVERSA_OH_TAG_TUCXA_ID=
```

---

## 4. Testar localmente

### 4.1. Página Quero Conhecer

Acesse:

```txt
http://localhost:3000/solucoes/organizacao-em-harmonia/quero-conhecer
```

Preencha:

```txt
Nome do contato: Márcio Alexandre
WhatsApp: 19992360856
E-mail: tucxacentro@gmail.com
```

Resultado esperado:

1. lead salvo/atualizado em `oh_leads`;
2. organização criada/atualizada em `oh_organizations`;
3. pessoa criada/atualizada em `oh_people`;
4. usuário Supabase Auth criado, se ainda não existir;
5. e-mail enviado com link `/solucoes/organizacao-em-harmonia/login`;
6. página Obrigado com botão para WhatsApp;
7. contato BotConversa enriquecido com campos `oh_*`;
8. campo `oh_resp_botconversa` preenchido com mensagem da Organização em Harmonia.

---

## 5. Testar endpoint BotConversa

Depois de publicar na Vercel, teste:

```powershell
Invoke-RestMethod `
  -Uri "https://www.automacaoextrema.com/api/admin/organizacao-em-harmonia/botconversa-test?token=SEU_TOKEN" `
  -Method Get
```

Depois:

```powershell
$body = @{
  contactName = "Márcio Alexandre"
  email = "tucxacentro@gmail.com"
  whatsapp = "19992360856"
  leadId = "debug-oh-tucxa"
  moduleSlug = "organizacao-em-harmonia"
  priorityModuleSlug = "agenda-viva"
  organizationName = "Tucxa"
  founderTermsAccepted = $true
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://www.automacaoextrema.com/api/admin/organizacao-em-harmonia/botconversa-test?token=SEU_TOKEN" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

No retorno, procure:

```txt
set_field_oh_resp_botconversa ok=true
send_oh_flow ok=true
```

---

## 6. GitHub

```powershell
git checkout feature/organizacao-em-harmonia

git status
git add .
git commit -m "Corrige acesso e WhatsApp da Organizacao em Harmonia"
git push origin feature/organizacao-em-harmonia
```

---

## 7. Vercel

Depois do push, valide o Preview da branch.

Se for publicar em produção:

```powershell
npx vercel --prod
```

ou faça merge para a branch de produção configurada na Vercel.

---

## 8. Como repetir o mesmo cadastro

Não é necessário excluir o contato no BotConversa.

O comportamento esperado agora é:

```txt
Mesmo e-mail ou mesmo WhatsApp
→ atualiza/reaproveita o lead existente
→ atualiza/reaproveita organização e pessoa
→ sobrescreve campos OH no BotConversa
→ sobrescreve oh_resp_botconversa
→ dispara o fluxo OH - Lead vindo do site, se BOTCONVERSA_OH_SEND_FLOW=true
```

Se quiser teste totalmente limpo, rode no Supabase:

```sql
delete from public.oh_leads
where lower(email) = lower('tucxacentro@gmail.com')
   or regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') in ('19992360856', '5519992360856');
```

No BotConversa, limpar campos é opcional. O normal deve ser a AE sobrescrever os campos automaticamente.
