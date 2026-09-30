# Tucxa — Agendamento 05 — configuração de SMS

## Objetivo

Ativar o envio do SMS de confirmação logo após a Recepção criar um agendamento, usando o provider já suportado pelo projeto (`twilio`).

## Custos de referência em 25/09/2026

A página pública da Twilio para o Brasil informa US$ 0,0599 por segmento de SMS enviado por número internacional, além de eventuais taxas de operadora. Um número internacional SMS-capable parte de US$ 1,15/mês.

Para 300 segmentos/mês:

- mensagens: 300 × US$ 0,0599 = US$ 17,97;
- número: aproximadamente US$ 1,15/mês;
- subtotal de referência: US$ 19,12/mês, antes de taxas adicionais.

O SMS é cobrado por segmento, não por “mensagem visual”. Mensagens GSM-7 de até 160 caracteres cabem em um segmento; mensagens Unicode podem cair para 70 caracteres no primeiro segmento. Nesta evolução, os textos do Tucxa foram encurtados, o link de confirmação ganhou a rota curta `/a/[token]` e a camada de envio remove acentos/caracteres Unicode para reduzir a chance de múltiplos segmentos.

## 1. Criar conta Twilio

1. Acesse https://www.twilio.com/try-twilio
2. Crie a conta.
3. Confirme o e-mail.
4. Confirme seu telefone.
5. Use o trial apenas para conhecer o Console e validar a conta.

Observação: o trial atual tem limitações de destinatários e de conteúdo. Para o corpo personalizado usado pelo Tucxa, faça o upgrade antes da homologação real do sistema.

## 2. Fazer upgrade da conta

No Console da Twilio:

1. Abra Billing / Upgrade.
2. Cadastre a forma de pagamento.
3. Conclua as informações de perfil solicitadas pela Twilio.
4. Aguarde eventuais validações exigidas para o uso de Messaging.

## 3. Obter um remetente SMS válido

No Console:

1. Abra Phone Numbers.
2. Procure um número com capacidade SMS que possa enviar para o Brasil.
3. Adquira/provisione o número.
4. Copie-o no formato E.164, por exemplo `+1XXXXXXXXXX`.

Não use simplesmente o WhatsApp do Tucxa como `TWILIO_SMS_FROM`. Um número funcionar no WhatsApp não significa que esteja provisionado como remetente SMS.

## 4. Obter as credenciais

No Twilio Console, copie:

- Account SID;
- Auth Token;
- número SMS adquirido/provisionado.

Nunca grave essas informações em `.ts`, `.tsx`, `.md`, migration SQL ou GitHub.

## 5. Configurar localmente

No `.env.local` do projeto, acrescente:

```text
TUCXA_SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_SMS_FROM=+1XXXXXXXXXX
```

O `.env.local` não deve ser versionado.

Reinicie o servidor local depois de mudar as variáveis:

```powershell
npm run dev
```

## 6. Configurar no Vercel Preview

No Vercel:

1. Abra o projeto Automação Extrema.
2. Vá em **Settings > Environment Variables**.
3. Cadastre `TUCXA_SMS_PROVIDER` com valor `twilio`.
4. Cadastre `TWILIO_ACCOUNT_SID`.
5. Cadastre `TWILIO_AUTH_TOKEN`.
6. Cadastre `TWILIO_SMS_FROM`.
7. Marque inicialmente o ambiente **Preview**.
8. Salve.
9. Abra **Deployments** e faça **Redeploy** do Preview da branch `feature/tucxa-em-harmonia-agendamentos-piloto-v1`.

## 7. Testar o envio imediato

1. Entre no Preview como Recepção.
2. Abra Agendamento.
3. Pesquise/cadastre um Consulente com um celular real de teste.
4. Crie o agendamento.
5. A resposta da tela deve mudar de “Provedor de SMS não configurado” para “SMS enviado”.
6. Confira o SMS no aparelho.
7. Clique no link curto `/a/[token]` e confirme que ele redireciona para a página pública de confirmação.
8. No Console da Twilio, abra Messaging Logs e confirme o status da mensagem.

## 8. Produção

Somente depois da homologação:

1. Edite as mesmas quatro variáveis no Vercel.
2. Habilite também **Production**.
3. Faça o deploy da versão que estiver aprovada para `main`.

## 9. Lembretes automáticos

A rota existente é:

```text
/api/cron/tucxa-agendamento-reminders
```

Ela exige:

```text
CRON_SECRET=<segredo forte>
```

O envio imediato do SMS ao criar o agendamento NÃO depende do cron.

Os lembretes configuráveis (por exemplo, 24h e 4h antes) exigem que essa rota seja chamada periodicamente. Antes de alterar `vercel.json`, confirme o plano do Vercel: frequências de cron disponíveis variam por plano. Enquanto isso, o endpoint pode ser homologado manualmente com o header `Authorization: Bearer <CRON_SECRET>`.

Nesta evolução, o lembrete foi encurtado e orienta o Consulente a usar o link recebido no SMS inicial. O token de confirmação original não é armazenado em texto puro, portanto o cron não tenta reconstruí-lo.
