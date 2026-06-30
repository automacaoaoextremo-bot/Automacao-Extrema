# BotConversa — Organização em Harmonia

## Objetivo

Configurar o fluxo **OH - Lead vindo do site** para funcionar no mesmo padrão do **CED - Lead vindo do site**:

```txt
Site → Quero Conhecer → e-mail de acesso → página Obrigado → WhatsApp → BotConversa
```

O bloco principal do BotConversa pode usar:

```txt
{oh_resp_botconversa}
```

Esse campo é preenchido pela Automação Extrema via API.

---

## 1. Fluxo principal

Nome recomendado:

```txt
OH - Lead vindo do site
```

Estrutura:

```txt
Bloco Inicial
↓
Conteúdo: {oh_resp_botconversa}
```

Use o seletor de campos do BotConversa para inserir `oh_resp_botconversa`.

---

## 2. Palavras-chave

Configurar condição **Contém**:

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

Importante: evite que o fluxo CED capture a mensagem da Organização em Harmonia. A mensagem da página Obrigado agora menciona claramente Organização em Harmonia e Agenda Viva.

---

## 3. Campos personalizados OH

Crie ou confirme os campos abaixo e use os IDs reais no `.env.local` e Vercel:

```txt
oh_nome_contato
oh_email
oh_whatsapp
oh_lead_id
oh_modulo
oh_modulo_slug
oh_modulo_prioritario
oh_prazo_implantacao
oh_organizacao
oh_origem
oh_status
oh_login_url
oh_interesse_cliente_fundador
oh_email_enviado
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
BOTCONVERSA_OH_FIELD_IMPLANTATION_DUE_AT_ID=
BOTCONVERSA_OH_FIELD_ORGANIZATION_ID=
BOTCONVERSA_OH_FIELD_ORIGIN_ID=
BOTCONVERSA_OH_FIELD_STATUS_ID=
BOTCONVERSA_OH_FIELD_LOGIN_URL_ID=
BOTCONVERSA_OH_FIELD_FOUNDER_ID=
BOTCONVERSA_OH_FIELD_EMAIL_SENT_ID=
BOTCONVERSA_OH_FIELD_RESPONSE_ID=
```

---

## 4. Etiquetas OH

Crie ou confirme:

```txt
oh_lead_site
oh_email_confirmacao_enviado
oh_cliente_fundador_interesse
oh_aguardando_implantacao
oh_agenda_viva
oh_tucxa
oh_ajuda_solicitada
oh_precisa_humano
```

Variáveis correspondentes:

```env
BOTCONVERSA_OH_TAG_LEAD_SITE_ID=
BOTCONVERSA_OH_TAG_EMAIL_SENT_ID=
BOTCONVERSA_OH_TAG_FOUNDER_ID=
BOTCONVERSA_OH_TAG_WAITING_ACCESS_ID=
BOTCONVERSA_OH_TAG_AGENDA_VIVA_ID=
BOTCONVERSA_OH_TAG_TUCXA_ID=
BOTCONVERSA_OH_TAG_HELP_REQUESTED_ID=
BOTCONVERSA_OH_TAG_NEEDS_HUMAN_ID=
```

---

## 5. Fluxo AJUDA

Criar palavra-chave com condição **Começa com** ou **Contém**:

```txt
AJUDA
```

Mensagem:

```txt
Claro. Para te ajudar melhor, escolha uma opção:

1 - Não encontrei o e-mail de acesso
2 - Quero entender o Cliente Fundador
3 - Quero começar pelo Agenda Viva
4 - Quero falar sobre Atendimento em Harmonia
5 - Quero falar sobre Corrente em Dia
6 - Quero falar com a equipe
```

Ações recomendadas:

```txt
Adicionar etiqueta: oh_ajuda_solicitada
Definir oh_status = ajuda_solicitada
Notificar equipe / Márcio
```

---

## 6. Mensagem esperada no WhatsApp

A mensagem final do campo `oh_resp_botconversa` deve conter:

```txt
Pronto, [nome]. Seu cadastro da Organização em Harmonia já foi recebido.

Seu acesso inicial já foi preparado para começar a configuração da organização.

Link de acesso:
https://www.automacaoextrema.com/solucoes/organizacao-em-harmonia/login

E-mail usado no cadastro:
[e-mail informado]

As orientações também foram enviadas para esse e-mail. Se não encontrar a mensagem de acesso, confira também spam/lixo eletrônico.

Se já tiver senha, use sua senha atual. Se não lembrar, clique em "Esqueci minha senha" na tela de login.

Dados recebidos:
Nome do contato: ...
WhatsApp informado: ...
Organização: será confirmada no primeiro acesso
Interesse inicial: Organização em Harmonia
Primeiro módulo recomendado: Agenda Viva
Código do lead: ...
Cliente Fundador: será confirmado no primeiro acesso

Próximo passo:
acesse a área da Organização em Harmonia, complete o cadastro da organização e comece pela Base Única.

Se tiver qualquer dificuldade, responda AJUDA por aqui.
```

Não enviar senha temporária pelo WhatsApp.

---

## 7. Teste recomendado

1. Preencher o Quero Conhecer com:

```txt
Nome do contato: Márcio Alexandre
WhatsApp: 19992360856
E-mail: tucxacentro@gmail.com
```

2. Conferir o e-mail recebido: deve conter login, e-mail e senha temporária quando for novo usuário.
3. Clicar em Continuar cadastro pelo WhatsApp.
4. Conferir no BotConversa se `oh_resp_botconversa` foi preenchido.
5. Conferir se o fluxo respondeu com Organização em Harmonia, não Corrente em Dia.
