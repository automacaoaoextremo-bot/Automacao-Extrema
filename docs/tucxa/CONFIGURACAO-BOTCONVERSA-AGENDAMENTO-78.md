# TUCXA · Ajuste 78 · Gestão de envios e pizzas beneficentes

## Objetivo

A tela `Gestão -> Envios WhatsApp` permite selecionar uma data de atendimento e enviar, para um, alguns ou todos os agendamentos elegíveis:

- **Solicitado**: lembrete + link de confirmação + mensagem das pizzas;
- **Confirmado**: lembrete sem link de confirmação + mensagem das pizzas.

Os envios são registrados em `oh_tucxa_pilot_notification_log`, por appointment e por tipo. Um item já enviado é pulado automaticamente em uma nova tentativa, evitando duplicidade acidental.

## Fluxos reutilizados

### `TUCXA - Lembrete Agendamento`

Continua sendo usado para agendamentos **Solicitados**.

O código gera um link de confirmação novo e preenche os campos já existentes:

- `TUCXA - Nome`
- `TUCXA - Data do atendimento`
- `TUCXA - Entidade`
- `TUCXA - Link de confirmação`
- `TUCXA - Ordem`, quando configurado

Não é necessário criar novo campo personalizado para esse envio.

## Novo fluxo 1 — `TUCXA - Lembrete Confirmado`

Esse fluxo é necessário porque o fluxo atual de lembrete contém orientação para confirmar presença e pode reaproveitar um link antigo. Para quem já está confirmado, a mensagem precisa ser diferente.

No BotConversa:

1. `Fluxos de conversa -> Criar Novo Fluxo`.
2. Nome: `TUCXA - Lembrete Confirmado`.
3. Conecte o Bloco Inicial a um bloco `Conteúdo`.
4. Use um texto como:

```text
Olá, {TUCXA - Nome}! 🌿

Passando para lembrar que seu atendimento no TUCXA está confirmado para {TUCXA - Data do atendimento}, com a Entidade {TUCXA - Entidade}.

Chegada orientada: 18h30 às 19h20.
A porta fecha às 19h20 e reabre às 20h00.

📍 Local do atendimento:
Rua Talvino Egídio de Souza Aranha Júnior, 179 - Jardim Miranda - Campinas/SP - CEP 13034-611

🗺️ Google Maps:
https://www.google.com/maps/search/?api=1&query=Rua%20Talvino%20Eg%C3%ADdio%20de%20Souza%20Aranha%20J%C3%BAnior%2C%20179%20-%20Jardim%20Miranda%20-%20Campinas%2FSP%20-%20CEP%2013034-611

🔴 *Em caso de dúvida, fale com a Recepção do TUCXA.*
```

Depois do texto, mantenha/adapte o elemento `Contato` da Recepção, se usado nos outros fluxos.

Obtenha o ID pelo Swagger/API do BotConversa e configure:

```text
BOTCONVERSA_TUCXA_CONFIRMED_REMINDER_FLOW_ID=<ID_DO_FLUXO>
```

## Novo fluxo 2 — `TUCXA - Pizza Beneficente`

Esse fluxo utiliza os mesmos campos já existentes. Não é necessário novo campo personalizado.

Crie o fluxo `TUCXA - Pizza Beneficente` e use exatamente a mensagem abaixo, com a alteração solicitada no Ajuste 78:

```text
🌿 Olá! Como você já estará conosco no TUCXA em {TUCXA - Data do atendimento}, queremos deixar uma dica para a volta para casa. 😊

Estamos com pizzas beneficentes congeladas por R$ 50,00, nos sabores:

🧀 Mussarela
🌶️ Calabresa
🥩 Lombinho

É uma opção prática para levar e preparar quando quiser — e, ao adquirir uma pizza, você também colabora com a manutenção da nossa Casa e com a continuidade dos trabalhos do TUCXA. 💚

Se tiver interesse, pode aproveitar sua vinda para retirar a sua.

🍕 Você leva uma refeição para casa e deixa também uma contribuição para a Casa que acolhe tanta gente. 🙏

Sem compromisso. Estamos apenas compartilhando esta possibilidade com carinho.
```

Importante: não usar mais a frase `como você já estará conosco amanhã`. O fluxo deve usar a data real do campo `{TUCXA - Data do atendimento}`.

Obtenha o ID e configure:

```text
BOTCONVERSA_TUCXA_PIZZA_FLOW_ID=<ID_DO_FLUXO>
```

## Vercel

Manter as variáveis já existentes e acrescentar:

```text
BOTCONVERSA_TUCXA_CONFIRMED_REMINDER_FLOW_ID=<ID>
BOTCONVERSA_TUCXA_PIZZA_FLOW_ID=<ID>
```

Para homologação, configure também no ambiente `Preview` da branch:

```text
feature/tucxa-em-harmonia-agendamentos-piloto-v1
```

Depois, configure as mesmas duas variáveis em `Production` antes do uso definitivo.

Não há alteração em `vercel.json`.

## Como a marcação de envio funciona

A tela utiliza a tabela já existente `oh_tucxa_pilot_notification_log` com:

- `manual_reminder`
- `manual_confirmation_link`
- `manual_pizza`

Os tipos manuais usam canal `whatsapp` e `scheduled_offset_hours = -1`, reservando essa combinação para a Gestão.

Quando um lembrete manual é enviado com sucesso, o sistema também registra `day_reminder` com `scheduled_offset_hours = 0`. Assim, o cron automático do dia reconhece que aquele lembrete já foi atendido e não o envia novamente. Se o cron já tiver enviado `day_reminder`, a Gestão também reconhece esse envio e não duplica o lembrete.

Não há migration nova.

## Homologação sugerida

1. Escolher uma data futura com pelo menos um Solicitado e um Confirmado.
2. Selecionar somente o Solicitado e enviar.
3. Conferir no WhatsApp:
   - lembrete;
   - link de confirmação;
   - pizza com a data real do atendimento.
4. Voltar à Gestão e confirmar que os três itens aparecem como enviados.
5. Selecionar o Confirmado e enviar.
6. Conferir:
   - lembrete sem pedido/link de confirmação;
   - mensagem da pizza com a data real.
7. Repetir o envio dos mesmos registros: os itens já enviados devem ser pulados.
