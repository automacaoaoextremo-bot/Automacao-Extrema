# BotConversa — aviso à Recepção após confirmação

Esta evolução acrescenta um aviso automático para o WhatsApp da Recepção do Tucxa quando o Consulente confirma a presença pelo link.

## Fluxo novo

Crie no BotConversa:

`TUCXA - Recepção - Confirmação`

Use os mesmos campos personalizados já existentes do piloto:

- `TUCXA - Nome`
- `TUCXA - Data do atendimento`
- `TUCXA - Entidade`
- `TUCXA - Link de confirmação`

No fluxo da Recepção, o último campo é reutilizado para carregar o **link de login da Recepção**. Não é necessário criar um novo campo personalizado.

Texto sugerido:

```text
TUCXA · Presença confirmada

{TUCXA - Nome} confirmou o atendimento de
{TUCXA - Data do atendimento}, com a Entidade
{TUCXA - Entidade}.

Para conferir no sistema, entre pelo link:
{TUCXA - Link de confirmação}
```

O link abre o Login único e guarda o retorno para o Acolhimento.

## Descobrir o ID

Em `Configurações → Integrações → API → Swagger`, execute `GET /flows/` e anote o ID de `TUCXA - Recepção - Confirmação`.

## Variáveis no Vercel

Para a branch Preview do piloto, adicione:

```text
BOTCONVERSA_TUCXA_RECEPTION_CONFIRMATION_FLOW_ID=<id do fluxo>
TUCXA_RECEPTION_WHATSAPP=5519989045150
```

`TUCXA_RECEPTION_WHATSAPP` é opcional no código porque existe fallback para o número atual do Tucxa, mas é recomendável configurá-lo explicitamente para facilitar futuras alterações.

Continuam obrigatórias as variáveis já existentes:

```text
BOTCONVERSA_ENABLED=true
BOTCONVERSA_TUCXA_ENABLED=true
BOTCONVERSA_API_KEY=...
BOTCONVERSA_TUCXA_FIELD_NAME_ID=...
BOTCONVERSA_TUCXA_FIELD_DATE_ID=...
BOTCONVERSA_TUCXA_FIELD_ENTITY_ID=...
BOTCONVERSA_TUCXA_FIELD_CONFIRMATION_URL_ID=...
```

Não coloque API Key no GitHub.

## Comportamento em falha

A confirmação do Consulente é a operação principal. Se o BotConversa estiver indisponível ou o fluxo da Recepção não estiver configurado, a presença continua sendo confirmada. A falha do aviso é registrada no log do servidor para diagnóstico e não desfaz a confirmação.
