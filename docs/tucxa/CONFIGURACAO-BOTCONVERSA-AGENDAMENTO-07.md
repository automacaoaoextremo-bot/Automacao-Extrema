# TUCXA — Agendamento 07 — BotConversa / WhatsApp

## Objetivo

O piloto deixa de usar SMS para confirmações e lembretes. O envio automático passa a usar o WhatsApp da Automação Extrema conectado ao BotConversa. O link de confirmação continua sendo gerado pelo Tucxa e gravado no contato antes do disparo do fluxo.

## 1. Confirmar o tipo de conexão do WhatsApp

No BotConversa, confira se a conexão é **API Oficial** ou conexão por QR Code.

- API Oficial: mensagens iniciadas fora da janela de 24 horas precisam começar por um modelo aprovado pela Meta.
- Conexão por QR Code: não usa modelos oficiais da Meta, mas deve seguir as regras e limitações da conexão contratada.

Para confirmações de agendamento, a categoria adequada na API Oficial é **Utilidade**.

## 2. Obter a chave da API

No BotConversa:

1. Configurações
2. Geral
3. Integrações
4. Aba Externo
5. Bloco API
6. Copiar a **Chave API**

Não use a chave do Zapier. Não coloque a chave no GitHub.

## 3. Criar campos personalizados

Crie cinco campos personalizados para o fluxo do Tucxa:

- `TUCXA - Nome`
- `TUCXA - Data do atendimento`
- `TUCXA - Entidade`
- `TUCXA - Link de confirmação`
- `TUCXA - Antecedência do lembrete`

Depois consulte os IDs pelo Swagger/endpoint `GET /custom_fields/` e anote cada ID.

## 4. Criar o modelo de Utilidade (API Oficial)

Nome sugerido: `tucxa_confirmacao_agendamento`

Texto sugerido:

> Olá, {{1}}. Esta mensagem é enviada pela Automação Extrema em apoio ao Tucxa para confirmar seu atendimento. Seu atendimento no Tucxa está reservado para {{2}}, com {{3}}. Use o botão abaixo para confirmar sua presença. Em caso de dúvida, fale com a Recepção do Tucxa.

Botão sugerido:

- `Confirmar presença`
- URL dinâmica alimentada pelo campo `TUCXA - Link de confirmação`

A mensagem identifica explicitamente a Automação Extrema porque o número remetente é diferente do WhatsApp normalmente usado pelo Tucxa.

## 5. Criar o fluxo de confirmação

Crie um fluxo com nome sugerido:

`TUCXA - Confirmar Agendamento`

No fluxo:

1. Inicie com o modelo aprovado, quando a conexão for API Oficial.
2. Mapeie as variáveis para os campos personalizados do Tucxa.
3. Use o campo do link de confirmação no botão/URL.
4. Salve e publique o fluxo.

Obtenha o ID pelo endpoint `GET /flows/`.

## 6. Criar o fluxo de lembrete

Nome sugerido:

`TUCXA - Lembrete Agendamento`

Texto sugerido:

> Olá, {{1}}. Lembrete do seu atendimento no Tucxa em {{2}}, com {{3}}. Se ainda não confirmou sua presença, use o link de confirmação recebido anteriormente.

Obtenha também o ID deste fluxo por `GET /flows/`.

## 7. Variáveis no Vercel

Em **Project > Settings > Environment Variables**, configurar inicialmente em Preview:

```text
BOTCONVERSA_ENABLED=true
BOTCONVERSA_TUCXA_ENABLED=true
BOTCONVERSA_API_KEY=<chave do bloco API>
BOTCONVERSA_TUCXA_CONFIRMATION_FLOW_ID=<id do fluxo de confirmação>
BOTCONVERSA_TUCXA_REMINDER_FLOW_ID=<id do fluxo de lembrete>
BOTCONVERSA_TUCXA_FIELD_NAME_ID=<id do campo TUCXA - Nome>
BOTCONVERSA_TUCXA_FIELD_DATE_ID=<id do campo TUCXA - Data do atendimento>
BOTCONVERSA_TUCXA_FIELD_ENTITY_ID=<id do campo TUCXA - Entidade>
BOTCONVERSA_TUCXA_FIELD_CONFIRMATION_URL_ID=<id do campo TUCXA - Link de confirmação>
BOTCONVERSA_TUCXA_FIELD_REMINDER_HOURS_ID=<id do campo TUCXA - Antecedência do lembrete>
```

Opcionalmente:

```text
BOTCONVERSA_DEBUG=true
```

Use `BOTCONVERSA_DEBUG` apenas durante homologação e retire depois.

O código já usa por padrão:

```text
https://backend.botconversa.com.br
```

portanto `BOTCONVERSA_API_BASE_URL` não precisa ser configurado salvo se houver motivo específico.

## 8. Redeploy

Depois de salvar as variáveis:

1. Vercel > Deployments
2. Abrir o Preview da branch do piloto
3. Redeploy
4. Aguardar Ready

## 9. Testar confirmação imediata

1. Entrar como Recepção.
2. Criar um agendamento para um telefone de teste.
3. O sistema procura o contato no BotConversa pelo telefone.
4. Se não existir, cria o contato.
5. Atualiza os campos personalizados.
6. Dispara o fluxo de confirmação.
7. O popup do Tucxa deve informar que a confirmação foi enviada pelo WhatsApp.
8. O botão manual `Enviar confirmação pelo WhatsApp` continua disponível como contingência.

## 10. Lembretes automáticos

A rota já existente é:

```text
/api/cron/tucxa-agendamento-reminders
```

Ela exige:

```text
CRON_SECRET=<segredo forte>
```

O Agendamento 07 não adiciona uma frequência nova ao `vercel.json`, pois a frequência suportada depende do plano do Vercel. Para disparar lembretes automaticamente, configure um agendador compatível para chamar a rota periodicamente com:

```text
Authorization: Bearer <CRON_SECRET>
```

As antecedências continuam configuráveis na tela da Recepção, por exemplo `24, 4` horas.

## 11. Produção

Somente depois da homologação:

1. Replicar as variáveis BotConversa de Preview para Production.
2. Manter `BOTCONVERSA_DEBUG` desativado.
3. Homologar um contato real controlado.
4. Só então liberar os envios para os Consulentes.

## Segurança

Nunca versionar:

- API Key do BotConversa
- tokens
- chaves do Vercel
- `CRON_SECRET`
- arquivos `.env*`
