# TUCXA · Agendamento 11 · BotConversa e lembrete no dia

## Objetivo

Adicionar um segundo fluxo do BotConversa para lembrar o Consulente no próprio dia do atendimento.

A confirmação criada no momento do agendamento continua usando:

- `BOTCONVERSA_TUCXA_CONFIRMATION_FLOW_ID`

O novo lembrete usa:

- `BOTCONVERSA_TUCXA_REMINDER_FLOW_ID`

Não é necessário criar novos campos personalizados. O lembrete reutiliza os campos já existentes:

- TUCXA - Nome
- TUCXA - Data do atendimento
- TUCXA - Entidade
- TUCXA - Link de confirmação
- TUCXA - Antecedência do lembrete

A integração foi ajustada para NÃO apagar o campo `TUCXA - Link de confirmação` durante o lembrete. Assim, o fluxo do dia pode reutilizar o link gravado no envio inicial.

## 1. Atualizar o fluxo atual de confirmação

Abra:

`Fluxos de conversa -> TUCXA - Confirmar Agendamento`

No bloco `Conteúdo`, mantenha a mensagem atual.

Como a companhia está usando a conexão não oficial (QR Code), o equivalente mais direto a um botão de contato é o elemento `Contato`, que aparece no próprio painel de Conteúdo.

Depois do texto, adicione:

- Nome: `TUCXA - Recepção`
- WhatsApp: `+55 19 98904-5150`

Opcionalmente, acrescente também ao fim do texto:

`Falar com a Recepção do TUCXA: https://wa.me/5519989045150`

Salve o fluxo.

## 2. Criar o novo fluxo

No BotConversa:

`Fluxos de conversa -> Criar Novo Fluxo`

Nome:

`TUCXA - Lembrete Agendamento`

Conecte o `Bloco Inicial` a um bloco `Conteúdo`.

Texto sugerido:

Olá, {TUCXA - Nome}! 🌿

Lembramos que seu atendimento no TUCXA é hoje, {TUCXA - Data do atendimento}, com a Entidade {TUCXA - Entidade}.

Chegada orientada: 18h30 às 19h20.
A porta fecha às 19h20.

Se sua presença ainda não estiver confirmada, pedimos que confirme até as 16:00 pelo link abaixo:
{TUCXA - Link de confirmação}

Em caso de dúvida, fale com a Recepção do TUCXA.

Depois do texto, adicione também um elemento `Contato`:

- Nome: `TUCXA - Recepção`
- WhatsApp: `+55 19 98904-5150`

Salve o fluxo.

## 3. Obter o ID do fluxo

Abra:

`Configurações -> Integrações -> API -> Swagger`

Autorize com a API Key e execute:

`GET /flows/`

Localize:

`TUCXA - Lembrete Agendamento`

Anote o `id`.

## 4. Vercel

Em:

`Vercel -> automacao-extrema -> Settings -> Environment Variables`

Crie:

`BOTCONVERSA_TUCXA_REMINDER_FLOW_ID=<ID_DO_FLUXO>`

Para homologação manual, inclua na Preview Branch:

`feature/tucxa-em-harmonia-agendamentos-piloto-v1`

Para produção, inclua também em Production antes da ativação definitiva.

O endpoint do cron exige:

`CRON_SECRET=<segredo forte>`

Se `CRON_SECRET` já estiver configurado para os outros crons do projeto, reutilize o mesmo valor.

## 5. Horário automático

O `vercel.json` desta evolução adiciona:

```json
{
  "path": "/api/cron/tucxa-agendamento-reminders",
  "schedule": "0 12 * * *"
}
```

A Vercel interpreta cron em UTC.

`12:00 UTC` corresponde a `09:00` em São Paulo no cenário atual.

Em plano Hobby, o cron roda no máximo uma vez por dia e a precisão é por hora; portanto o disparo pode ocorrer dentro da faixa aproximada entre 09:00 e 09:59 em São Paulo.

Isso ainda deixa boa antecedência para o prazo de confirmação das 16:00.

Cron da Vercel é registrado apenas em Production. Preview deve ser testado manualmente.

## 6. Teste manual no Preview

Crie um agendamento de teste para a data de hoje e use um WhatsApp controlado.

Depois chame:

```powershell
$headers = @{
  Authorization = "Bearer SEU_CRON_SECRET"
}

Invoke-RestMethod `
  -Method GET `
  -Uri "https://SEU-PREVIEW.vercel.app/api/cron/tucxa-agendamento-reminders" `
  -Headers $headers
```

Resultado esperado:

- `dayReminder.sent` maior que zero para o agendamento elegível;
- mensagem recebida pelo BotConversa;
- o link de confirmação continua preenchido;
- novo disparo do mesmo cron não duplica o lembrete já enviado.

## 7. Regras do lembrete no dia

O cron do dia:

- considera agendamentos da data atual em `America/Sao_Paulo`;
- ignora cancelados/concluídos porque consulta apenas estados ativos;
- respeita `reminder_whatsapp_enabled = false`;
- não envia novamente quando já existe log `day_reminder` com status `sent`;
- envia o mesmo fluxo para confirmados e não confirmados;
- o texto do fluxo usa a frase condicional “Se sua presença ainda não estiver confirmada...”;
- não apaga o campo de link de confirmação gravado pelo envio inicial.
