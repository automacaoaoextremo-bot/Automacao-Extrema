# Passo a passo — ajustes mobile, funil agrupado e Boot Conversa

## 1. Fazer backup antes de substituir arquivos

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

git status
git add .
git commit -m "backup antes dos ajustes de funil mobile e boot conversa"
```

## 2. Aplicar os arquivos do zip

Descompacte este zip por cima da pasta do projeto, permitindo substituir os arquivos existentes.

## 3. Conferir variáveis de ambiente

No `.env.local` e no Vercel, confira:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://automacao-extrema.vercel.app

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=automacao.ao.extremo@gmail.com
SMTP_PASS=SENHA_DE_APP_DO_GMAIL

EMAIL_FROM_NAME=Automação Extrema
EMAIL_FROM=automacao.ao.extremo@gmail.com
EMAIL_COPY_TO=automacao.ao.extremo@gmail.com
EMAIL_NOTIFICATIONS_ENABLED=true

# opcional, mas recomendado para proteger a rota de cron
CRON_SECRET=crie-um-token-longo-aqui
```

> Se configurar `CRON_SECRET`, a rota `/api/cron/followup-alerts` exigirá `Authorization: Bearer SEU_TOKEN`.

## 4. Testar localmente

```powershell
npm install
npm run lint
npm run build
npm run dev
```

Acesse:

```text
http://localhost:3000/diagnostico
http://localhost:3000/login
http://localhost:3000/admin/ae
http://localhost:3000/admin/ae/funil
http://localhost:3000/admin/ae/solucoes
```

## 5. O que validar

### Mobile logado em Gestão

No celular, abaixo do cabeçalho devem aparecer atalhos para:

```text
Gestão | Soluções | Relatórios | Funil
```

O botão **Sair** permanece no cabeçalho superior.

### Funil

Na tela `/admin/ae/funil`, validar:

- botão **Voltar para Gestão**;
- filtros: pendentes, atrasados, enviados e todos;
- ações agrupadas por lead;
- destaque visual para follow-ups atrasados;
- botão **Abrir lead**;
- botões **Abrir WhatsApp**, **Copiar** e **Marcar enviado**.

### Soluções

Na tela `/admin/ae/solucoes`, validar:

- botão **Voltar para Gestão**;
- botão **+ Nova solução**;
- lista mobile friendly.

### Diagnóstico vindo do Boot Conversa

Teste uma URL como:

```text
http://localhost:3000/diagnostico?origem=bootconversa&area=financeiro&dor=perco_tempo&urgencia=30_dias
```

A página deve indicar que o pré-diagnóstico veio do WhatsApp e deixar os campos principais pré-preenchidos.

## 6. Ajuste recomendado no Boot Conversa

Após as três perguntas iniciais, envie o link assim:

```text
https://automacao-extrema.vercel.app/diagnostico?origem=bootconversa&area={{ae_area_dor}}&dor={{ae_motivo_dor}}&urgencia={{ae_urgencia}}
```

Mensagem sugerida:

```text
Perfeito. Pelas suas respostas, já dá para ter uma primeira leitura.

Agora, para eu complementar o diagnóstico e indicar uma solução mais certeira da Automação Extrema, responda este formulário rápido:

https://automacao-extrema.vercel.app/diagnostico?origem=bootconversa&area={{ae_area_dor}}&dor={{ae_motivo_dor}}&urgencia={{ae_urgencia}}

As primeiras respostas já serão consideradas.
```

## 7. E-mails internos da AE

Após o envio do diagnóstico:

- o lead recebe o e-mail normal, sem informações internas do funil;
- a AE recebe um e-mail separado com resumo do lead, solução sugerida, score, link do lead, link do funil e prazos das próximas mensagens de WhatsApp.

## 8. Alerta 15 minutos antes do follow-up

Foi criada a rota:

```text
/api/cron/followup-alerts
```

E o arquivo `vercel.json` agenda a execução a cada 5 minutos:

```json
{
  "crons": [
    {
      "path": "/api/cron/followup-alerts",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Essa rota busca follow-ups pendentes de WhatsApp que vencem em aproximadamente 15 minutos e envia alerta para `EMAIL_COPY_TO`.

## 9. Publicar no Vercel

Depois de validar localmente:

```powershell
git status
git add .
git commit -m "feat: melhora funil mobile alertas e integracao boot conversa"
git push
```

A Vercel deve iniciar o deploy automaticamente.

## 10. Observação importante sobre Vercel Cron

Os Cron Jobs da Vercel dependem do plano e da configuração do projeto. Se a execução automática não acontecer, teste manualmente acessando a rota ou configure o cron no painel da Vercel.

Não é necessário rodar SQL para esta atualização.
