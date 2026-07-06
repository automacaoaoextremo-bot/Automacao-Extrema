# Presença Querida — passo a passo de atualização na AE

Este pacote cria a solução **Presença Querida** dentro da Automação Extrema, seguindo a mesma estratégia de Cliente Fundador usada no Corrente em Dia, mas com domínio próprio: eventos afetivos, convidados, links individuais, confirmação de presença e painel de acompanhamento.

## 1. Antes de aplicar

1. Faça backup ou crie uma branch:

```bash
git checkout -b feature/presenca-querida-cliente-fundador
```

2. Confirme que o projeto atual está funcionando antes de sobrescrever arquivos:

```bash
npm install
npm run build
```

## 2. Aplicar os arquivos

1. Descompacte o zip recebido na raiz do projeto `automacao-extrema`.
2. Permita sobrescrever os arquivos existentes quando solicitado.
3. Os arquivos alterados propositalmente são:

```txt
.env.example
src/app/page.tsx
src/components/ae-solution-header.tsx
src/lib/ae-scoring.ts
src/lib/mail.ts
```

4. Os demais arquivos são novos e ficam em rotas/pastas próprias do Presença Querida.

## 3. Rodar o SQL no Supabase

No Supabase SQL Editor, rode o arquivo:

```txt
supabase/sql/20260620_07_presenca_querida_cliente_fundador.sql
```

Ele cria:

```txt
pq_events
pq_people
pq_roles
pq_person_events
pq_guests
pq_guest_messages
pq_client_terms
pq_leads
pq_v_dashboard_events
```

Também cadastra/atualiza a solução `presenca-querida` no catálogo `ae_solutions` e cria o evento demo **Daniela 50 anos** com convidados e mensagens fictícias.

## 4. Conferir variáveis de ambiente

Confirme no `.env.local` e na Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_AE_WHATSAPP_NUMBER=

EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
EMAIL_FROM=
EMAIL_FROM_NAME=Automação Extrema
EMAIL_COPY_TO=
AE_INTERNAL_WHATSAPP=
```

Observação: se `EMAIL_NOTIFICATIONS_ENABLED=false` ou SMTP não estiver configurado, o cadastro ainda cria lead/evento/usuário, mas o retorno da API indicará que o e-mail não foi enviado.

## 5. Instalar e validar localmente

```bash
npm install
npm run lint
npm run build
npm run dev
```

## 6. Testar rotas públicas

Abra:

```txt
/solucoes/presenca-querida
/solucoes/presenca-querida/quero-conhecer
/solucoes/presenca-querida/login
```

Faça um cadastro pelo formulário **Quero Conhecer**. O cadastro deve criar:

```txt
pq_leads
pq_events
pq_people
pq_person_events
pq_client_terms
ae_clients
usuário no Supabase Auth, quando ainda não existir
```

## 7. Testar login do cliente

1. Use o e-mail informado no formulário.
2. Use a senha temporária retornada pela API ou enviada por e-mail, se SMTP estiver ativo.
3. Acesse:

```txt
/solucoes/presenca-querida/login
/solucoes/presenca-querida/cliente
```

No painel devem aparecer:

```txt
checklist de primeiros passos
cards de convidados, confirmados, pendentes e taxa de resposta
atalhos para cadastro, convidados, mensagens, confirmações e relatórios
```

## 8. Testar confirmação individual de convidado

No Supabase, copie um `individual_token` da tabela `pq_guests`, por exemplo do evento demo Daniela 50 anos.

Abra:

```txt
/solucoes/presenca-querida/confirmar/SEU_TOKEN_AQUI
```

Teste a confirmação. A API deve atualizar o convidado em `pq_guests`.

## 9. Configurar BotConversa

Para localizar lead por WhatsApp, e-mail ou código do lead, use o endpoint:

```txt
POST /api/presenca-querida/leads/lookup
```

Exemplo de body:

```json
{
  "whatsapp": "{telefone}",
  "email": "{{email}}",
  "leadId": "{{lead_id}}",
  "source": "botconversa_pq_site"
}
```

O retorno traz:

```txt
botconversaMessage
botconversaReply
loginUrl
leadFormUrl
statusLabel
```

Use `botconversaReply` ou `botconversaMessage` na resposta automática.

## 10. Deploy na Vercel

Depois de validar localmente:

```bash
git add .
git commit -m "Adiciona Presença Querida Cliente Fundador"
git push
```

Na Vercel, confirme as variáveis e faça o deploy.

## 11. Próximas evoluções recomendadas

Esta entrega cria o MVP funcional para captação, Cliente Fundador, evento, painel e confirmação individual. Próximas melhorias naturais:

1. CRUD real de evento na tela Cadastro.
2. CRUD/importação CSV/XLSX de convidados.
3. Envio real de mensagens por fase via BotConversa.
4. Exportações CSV/PDF para buffet, recepção, etiquetas e lembrancinhas.
5. Galeria, agradecimento pós-evento e mural de recados.
6. Área administrativa/funil interno específico do Presença Querida.
