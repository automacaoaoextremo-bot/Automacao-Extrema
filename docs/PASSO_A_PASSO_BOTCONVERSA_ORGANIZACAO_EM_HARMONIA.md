# Passo a passo BotConversa — Organização em Harmonia

## Objetivo

Criar um fluxo inicial muito parecido com o que foi definido para o Corrente em Dia: o site coleta somente o mínimo necessário, a página de obrigado abre o WhatsApp da AE com mensagem pré-preenchida e o BotConversa responde automaticamente sem pedir tudo de novo.

## Fluxo principal

Nome recomendado:

```txt
OH - Lead vindo do site
```

Esse fluxo atende leads da suíte e dos módulos:

```txt
Organização em Harmonia
Agenda Viva
Atendimento em Harmonia
Corrente em Dia
```

## Campos personalizados

Crie os campos abaixo em **Configurações > Campos**. Depois, copie os IDs reais para o `.env.local` e Vercel.

```txt
oh_nome_contato
oh_email
oh_whatsapp
oh_lead_id
oh_modulo
oh_modulo_slug
oh_modulo_prioritario
oh_organizacao
oh_origem
oh_status
oh_login_url
oh_interesse_cliente_fundador
oh_email_enviado
oh_prazo_implantacao
oh_resp_botconversa
```

Variáveis correspondentes:

```env
BOTCONVERSA_OH_FIELD_NAME_ID=
BOTCONVERSA_OH_FIELD_EMAIL_ID=
BOTCONVERSA_OH_FIELD_WHATSAPP_ID=
BOTCONVERSA_OH_FIELD_LEAD_ID_ID=
BOTCONVERSA_OH_FIELD_MODULE_ID=
BOTCONVERSA_OH_FIELD_MODULE_SLUG_ID=
BOTCONVERSA_OH_FIELD_PRIORITY_MODULE_ID=
BOTCONVERSA_OH_FIELD_ORGANIZATION_ID=
BOTCONVERSA_OH_FIELD_ORIGIN_ID=
BOTCONVERSA_OH_FIELD_STATUS_ID=
BOTCONVERSA_OH_FIELD_LOGIN_URL_ID=
BOTCONVERSA_OH_FIELD_FOUNDER_ID=
BOTCONVERSA_OH_FIELD_EMAIL_SENT_ID=
BOTCONVERSA_OH_FIELD_IMPLANTATION_DUE_AT_ID=
BOTCONVERSA_OH_FIELD_RESPONSE_ID=
```

## Etiquetas

Crie as etiquetas:

```txt
oh_lead_site
oh_email_confirmacao_enviado
oh_cliente_fundador_interesse
oh_aguardando_validacao
oh_whatsapp_iniciado
oh_precisa_humano
oh_ajuda_solicitada
oh_agenda_viva_interesse
oh_tucxa_cliente_fundador
```

Variáveis correspondentes:

```env
BOTCONVERSA_OH_TAG_LEAD_SITE_ID=
BOTCONVERSA_OH_TAG_EMAIL_SENT_ID=
BOTCONVERSA_OH_TAG_FOUNDER_ID=
BOTCONVERSA_OH_TAG_WAITING_ACCESS_ID=
```

## Palavra-chave do fluxo principal

Em **Automação > Palavras-chave**, crie uma palavra-chave com condição **Contém**.

Frases:

```txt
Organização em Harmonia
Quero Conhecer
Preenchi o Quero Conhecer
Agenda Viva
Atendimento em Harmonia
Corrente em Dia
Cliente Fundador
Código do lead
```

## Estrutura do fluxo

### Versão recomendada após API validada

Use exatamente a estrutura simples:

```txt
Bloco inicial
↓
Conteúdo: {oh_resp_botconversa}
```

Essa mensagem é preenchida pela AE assim que o lead envia o formulário do site. Ela contém:

```txt
nome do contato
e-mail
WhatsApp
código do lead
interesse inicial
primeiro módulo recomendado
prazo sugerido de implantação
a orientação para procurar o e-mail em spam/lixo eletrônico
próximos passos
```

### Mensagem fixa de segurança, se a variável estiver vazia

Durante os testes, se o campo `{oh_resp_botconversa}` ainda não estiver sendo preenchido, use temporariamente este texto no bloco de conteúdo:

```txt
Olá, {primeiro-nome}! Recebi seu cadastro da Organização em Harmonia.

Seu interesse já está salvo e também enviamos uma confirmação para o e-mail informado no formulário. Se não encontrar, confira spam/lixo eletrônico.

A proposta é começar pelas dores reais da organização: pessoas, funções, permissões, agenda, atendimentos e contribuições em uma base mais clara, sem obrigar a rotina a mudar sua essência.

No caso do Tucxa, o primeiro módulo recomendado para validação é o Agenda Viva, organizando calendário, grupos, atividades, eventos, aprovações e responsáveis.

Se tiver qualquer dificuldade, responda AJUDA por aqui.
```

Ações após a mensagem:

```txt
Adicionar etiqueta: oh_lead_site
Adicionar etiqueta: oh_whatsapp_iniciado
Adicionar etiqueta: oh_aguardando_validacao
Definir oh_status = whatsapp_iniciado
Notificar equipe/Márcio
```

## Fluxo AJUDA

Crie uma palavra-chave separada:

```txt
AJUDA
```

Mensagem:

```txt
Claro. Vou te ajudar.

Escolha a etapa:

1 - Não encontrei o e-mail de confirmação
2 - Quero entender a Organização em Harmonia completa
3 - Quero falar sobre Agenda Viva
4 - Quero falar sobre Atendimento em Harmonia
5 - Quero falar sobre Corrente em Dia
6 - Quero falar com a equipe
```

Ações:

```txt
Adicionar etiqueta: oh_ajuda_solicitada
Adicionar etiqueta: oh_precisa_humano
Definir oh_status = ajuda_solicitada
Notificar equipe/Márcio
```

## Configuração da API AE → BotConversa

No `.env.local` e Vercel:

```env
BOTCONVERSA_ENABLED=true
BOTCONVERSA_API_KEY=SUA_CHAVE_WEBHOOK_INTEGRATION
BOTCONVERSA_API_BASE_URL=https://backend.botconversa.com.br
BOTCONVERSA_API_HEADER_NAME=API-KEY
BOTCONVERSA_AUTH_SCHEME=
BOTCONVERSA_CREATE_CONTACT_PATH=/api/v1/webhook/subscriber/
BOTCONVERSA_TAG_PATH_TEMPLATE=/api/v1/webhook/subscriber/{subscriberId}/tags/{tagId}/
BOTCONVERSA_FIELD_PATH_TEMPLATE=/api/v1/webhook/subscriber/{subscriberId}/custom_fields/{fieldId}/
BOTCONVERSA_FIELD_METHOD=POST
BOTCONVERSA_FIELD_BODY_MODE=value
```

O envio automático do fluxo pode ficar desligado no começo:

```env
BOTCONVERSA_OH_SEND_FLOW=false
BOTCONVERSA_OH_FLOW_ID=
```

Depois que confirmar que `oh_resp_botconversa` está sendo preenchido no contato, pode ligar:

```env
BOTCONVERSA_OH_SEND_FLOW=true
BOTCONVERSA_OH_FLOW_ID=ID_REAL_DO_FLUXO_OH_LEAD_VINDO_DO_SITE
```

## Observações importantes

- Não pedir nome, WhatsApp e e-mail novamente no fluxo principal.
- Não enviar senha por WhatsApp.
- Sempre orientar a procurar o e-mail no spam/lixo eletrônico.
- O WhatsApp deve ser continuação do cadastro, não uma nova barreira.
- Para o Tucxa, a recomendação inicial é começar pelo módulo Agenda Viva.
