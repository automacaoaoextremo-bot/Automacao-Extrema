# BotConversa — ajuste de data e link da Recepção — Agendamento 13

## Campo `TUCXA - Data atendim`

O campo deve continuar configurado no BotConversa como tipo **Data**.

A aplicação agora converte a data interna do agendamento, normalmente recebida como:

```text
2026-10-06
```

para o formato esperado pelo campo de Data do BotConversa:

```text
06/10/2026
```

Não é necessário recriar o campo nem alterar o ID configurado em:

```text
BOTCONVERSA_TUCXA_FIELD_DATE_ID
```

## Fluxos afetados

A mesma conversão é usada por:

- `TUCXA - Confirmar Agendamento`
- `TUCXA - Lembrete Agendamento`
- `TUCXA - Recepção - Confirmação`

Assim, o mesmo campo personalizado de data fica consistente nos três fluxos.

## Link do aviso à Recepção

No fluxo `TUCXA - Recepção - Confirmação`, o campo reutilizado para o link passa a receber diretamente:

```text
https://www.automacaoextrema.com/solucoes/organizacao-em-harmonia/agendamento/login
```

Não é mais enviado `returnTo`, data, token ou link de confirmação do Consulente nesse aviso.

## Vercel

Nenhuma variável nova é obrigatória nesta evolução.

Continuam sendo usadas as variáveis existentes do BotConversa, incluindo:

```text
BOTCONVERSA_ENABLED
BOTCONVERSA_TUCXA_ENABLED
BOTCONVERSA_API_KEY
BOTCONVERSA_TUCXA_CONFIRMATION_FLOW_ID
BOTCONVERSA_TUCXA_REMINDER_FLOW_ID
BOTCONVERSA_TUCXA_RECEPTION_CONFIRMATION_FLOW_ID
BOTCONVERSA_TUCXA_FIELD_NAME_ID
BOTCONVERSA_TUCXA_FIELD_DATE_ID
BOTCONVERSA_TUCXA_FIELD_ENTITY_ID
BOTCONVERSA_TUCXA_FIELD_CONFIRMATION_URL_ID
```

Não grave API Key no GitHub.
