# BotConversa — Organização em Harmonia

## Estratégia recomendada

Manter a mesma estratégia validada no Corrente em Dia:

```txt
Site → Quero Conhecer → Página Obrigado → WhatsApp pré-preenchido → BotConversa responde automaticamente
```

A AE também pode enriquecer o contato via API do BotConversa:

```txt
Formulário enviado
↓
AE cria lead em oh_leads
↓
AE envia e-mail de confirmação
↓
AE atualiza contato no BotConversa
↓
AE aplica etiquetas
↓
AE preenche campos personalizados
↓
Opcional: AE dispara fluxo OH - Lead vindo do site
```

## Campos personalizados sugeridos

Crie em **Configurações > Campos**:

```txt
oh_nome_contato
oh_email
oh_whatsapp
oh_lead_id
oh_modulo
oh_modulo_slug
oh_organizacao
oh_origem
oh_status
oh_login_url
oh_interesse_cliente_fundador
oh_email_enviado
oh_resp_botconversa
```

Depois encontre o ID real de cada campo pelo Swagger/API ou pela aba Network do navegador e coloque na Vercel/.env.local:

```env
BOTCONVERSA_OH_FIELD_NAME_ID=
BOTCONVERSA_OH_FIELD_EMAIL_ID=
BOTCONVERSA_OH_FIELD_WHATSAPP_ID=
BOTCONVERSA_OH_FIELD_LEAD_ID_ID=
BOTCONVERSA_OH_FIELD_MODULE_ID=
BOTCONVERSA_OH_FIELD_MODULE_SLUG_ID=
BOTCONVERSA_OH_FIELD_ORGANIZATION_ID=
BOTCONVERSA_OH_FIELD_ORIGIN_ID=
BOTCONVERSA_OH_FIELD_STATUS_ID=
BOTCONVERSA_OH_FIELD_LOGIN_URL_ID=
BOTCONVERSA_OH_FIELD_FOUNDER_ID=
BOTCONVERSA_OH_FIELD_EMAIL_SENT_ID=
BOTCONVERSA_OH_FIELD_RESPONSE_ID=
```

## Etiquetas sugeridas

Crie em **Configurações > Etiquetas**:

```txt
oh_lead_site
oh_email_confirmacao_enviado
oh_cliente_fundador_interesse
oh_aguardando_validacao
```

Depois preencha os IDs reais:

```env
BOTCONVERSA_OH_TAG_LEAD_SITE_ID=
BOTCONVERSA_OH_TAG_EMAIL_SENT_ID=
BOTCONVERSA_OH_TAG_FOUNDER_ID=
BOTCONVERSA_OH_TAG_WAITING_ACCESS_ID=
```

## Variáveis gerais da API BotConversa

```env
BOTCONVERSA_ENABLED=true
BOTCONVERSA_API_KEY=SUA_CHAVE_WEBHOOK_INTEGRATION
BOTCONVERSA_API_BASE_URL=https://backend.botconversa.com.br
BOTCONVERSA_API_HEADER_NAME=API-KEY
BOTCONVERSA_AUTH_SCHEME=
BOTCONVERSA_CREATE_CONTACT_PATH=/api/v1/webhook/subscriber/
BOTCONVERSA_TAG_PATH_TEMPLATE=/api/v1/webhook/subscriber/{subscriberId}/tags/{tagId}/
BOTCONVERSA_FIELD_PATH_TEMPLATE=/api/v1/webhook/subscriber/{subscriberId}/custom_fields/{fieldId}/
BOTCONVERSA_FLOW_PATH_TEMPLATE=/api/v1/webhook/subscriber/{subscriberId}/send_flow/{flowId}/
BOTCONVERSA_FIELD_METHOD=POST
BOTCONVERSA_FIELD_BODY_MODE=value
```

## Fluxo recomendado

Nome do fluxo:

```txt
OH - Lead vindo do site
```

Palavras-chave com condição **Contém**:

```txt
Organização em Harmonia
Atendimento em Harmonia
Agenda Viva
Corrente em Dia
Cliente Fundador
Quero conhecer
Preenchi o Quero Conhecer
```

## Bloco de conteúdo seguro

Enquanto valida os campos via API, use uma mensagem fixa para nunca deixar o lead sem resposta:

```txt
Olá, {primeiro-nome}! Recebi seu cadastro da Organização em Harmonia.

Seu interesse já está salvo e também enviamos uma confirmação para o e-mail informado no formulário. Se não encontrar, confira spam/lixo eletrônico.

A proposta é começar pelas dores reais da organização: pessoas, funções, permissões, agenda, atendimentos e contribuições em uma base mais clara, sem obrigar a rotina a mudar sua essência.

Próximo passo:
vamos entender qual módulo faz mais sentido primeiro, quais regras precisam ser configuradas e quem poderá aprovar, editar ou acompanhar cada informação.

Se tiver qualquer dificuldade, responda AJUDA por aqui.
```

Depois que confirmar que `oh_resp_botconversa` está sendo preenchido, o bloco pode usar:

```txt
{oh_resp_botconversa}
```

## Bloco de integração opcional: lookup

Se quiser manter lookup no fluxo, crie um bloco de integração:

```txt
POST
https://www.automacaoextrema.com/api/organizacao-em-harmonia/leads/lookup
```

Headers:

```txt
Content-Type: application/json
```

Corpo:

```json
{
  "source": "botconversa_oh_site",
  "whatsapp": "{telefone}"
}
```

Mapeamento de resposta:

```txt
botconversaMessage -> oh_resp_botconversa
found               -> oh_found
name                -> oh_nome_contato
email               -> oh_email
leadId              -> oh_lead_id
loginUrl            -> oh_login_url
```

## Quando ativar envio automático de fluxo pela AE

Inicialmente deixe:

```env
BOTCONVERSA_OH_SEND_FLOW=false
BOTCONVERSA_OH_FLOW_ID=
```

Quando confirmar que contato, etiquetas e campos estão sendo atualizados, coloque:

```env
BOTCONVERSA_OH_SEND_FLOW=true
BOTCONVERSA_OH_FLOW_ID=ID_REAL_DO_FLUXO
```

## Teste recomendado

1. Preencha Quero Conhecer no site.
2. Confirme `oh_leads` no Supabase.
3. Confirme e-mail recebido.
4. Confira contato no BotConversa.
5. Confirme campos personalizados.
6. Clique no botão da página Obrigado.
7. Veja se o fluxo responde.
8. Teste com mesmo telefone/e-mail repetido.
