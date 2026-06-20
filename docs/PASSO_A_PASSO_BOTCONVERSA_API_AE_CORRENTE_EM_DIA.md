# Corrente em Dia — AE → BotConversa API

## Objetivo

Quando o lead preencher **Quero Conhecer** no site, a Automação Extrema passa a chamar a API do BotConversa para enriquecer automaticamente o contato com:

- nome do contato;
- WhatsApp informado no formulário;
- e-mail informado;
- código do lead;
- URL de login;
- status do acesso;
- interesse em Cliente Fundador;
- etiqueta de origem do site;
- campo com mensagem pronta para WhatsApp, sem senha.

Isso reduz a dependência do lookup por `{telefone}` dentro do fluxo, porque o contato já chega no BotConversa com os dados principais preenchidos.

---

## Confirmação sobre o fluxo CED - Lead vindo do site

Sim. A princípio, o fluxo **CED - Lead vindo do site** pode ter somente um bloco de conteúdo principal, porque a AE já cria o lead, envia o e-mail e enriquece o contato no BotConversa.

A mensagem pode incluir todas as informações que fazem sentido para o lead, exceto a senha. Pode incluir:

- nome do contato;
- e-mail usado no cadastro;
- URL de login;
- código do lead;
- orientação para procurar o e-mail no spam/lixo eletrônico;
- orientação para usar “Esqueci minha senha”;
- próximos passos de configuração.

Não envie a senha temporária pelo WhatsApp.

Mensagem recomendada no bloco:

```text
Pronto, {primeiro-nome}. Seu cadastro do Corrente em Dia foi recebido.

Seu acesso inicial já foi preparado para começar a configuração da organização.

Link de acesso:
{ced_login_url}

E-mail usado no cadastro:
{ced_email}

As orientações também foram enviadas para esse e-mail. Se não encontrar a mensagem de acesso, confira também spam/lixo eletrônico.

Se já tiver senha, use sua senha atual. Se não lembrar, clique em “Esqueci minha senha” na tela de login.

Dados recebidos:
Nome do contato: {ced_nome_contato}
WhatsApp informado: {ced_whatsapp}
Código do lead: {ced_lead_id}
Cliente Fundador: {ced_interesse_cliente_fundador}

Próximo passo:
entre no sistema, complete o cadastro da organização, configure Pix, contribuições, funções e contribuintes.

Se tiver qualquer dificuldade, responda AJUDA por aqui.
```

Se o campo `ced_resp_botconversa` estiver configurado na API, o fluxo pode ser ainda mais simples:

```text
{ced_resp_botconversa}
```

---

## 1. BotConversa — obter chave API

No BotConversa:

1. Acesse **Configurações**.
2. Entre em **Integrações**.
3. Copie a chave **Webhook Integration**.
4. Use esta chave na variável `BOTCONVERSA_API_KEY`.

A central do BotConversa orienta copiar essa chave em Configurações > Integrações e usar no Authorize da documentação API. A documentação também lista endpoints para adicionar contatos, etiquetas, campos personalizados e enviar fluxo/mensagem.

---

## 2. BotConversa — criar campos personalizados

Crie os campos abaixo e anote o **ID de cada campo** na documentação/API autenticada do BotConversa:

| Campo | Uso |
|---|---|
| `ced_nome_contato` | Nome preenchido no Quero Conhecer |
| `ced_email` | E-mail de acesso |
| `ced_whatsapp` | WhatsApp informado no formulário |
| `ced_lead_id` | Código do lead na AE |
| `ced_origem` | Origem do cadastro |
| `ced_status` | Status do funil/acesso |
| `ced_login_url` | URL de login |
| `ced_interesse_cliente_fundador` | Sim ou pendente no primeiro acesso |
| `ced_acesso_email_enviado` | Sim/não |
| `ced_primeiro_acesso_status` | Aguardando primeiro acesso |
| `ced_resp_botconversa` | Mensagem completa pronta para o WhatsApp |

Depois configure no `.env.local` e na Vercel:

```env
BOTCONVERSA_CED_FIELD_NAME_ID=ID_DO_CAMPO
BOTCONVERSA_CED_FIELD_EMAIL_ID=ID_DO_CAMPO
BOTCONVERSA_CED_FIELD_WHATSAPP_ID=ID_DO_CAMPO
BOTCONVERSA_CED_FIELD_LEAD_ID_ID=ID_DO_CAMPO
BOTCONVERSA_CED_FIELD_ORIGIN_ID=ID_DO_CAMPO
BOTCONVERSA_CED_FIELD_STATUS_ID=ID_DO_CAMPO
BOTCONVERSA_CED_FIELD_LOGIN_URL_ID=ID_DO_CAMPO
BOTCONVERSA_CED_FIELD_FOUNDER_ID=ID_DO_CAMPO
BOTCONVERSA_CED_FIELD_EMAIL_SENT_ID=ID_DO_CAMPO
BOTCONVERSA_CED_FIELD_FIRST_ACCESS_ID=ID_DO_CAMPO
BOTCONVERSA_CED_FIELD_MESSAGE_ID=ID_DO_CAMPO
```

---

## 3. BotConversa — criar etiquetas

Crie estas etiquetas e anote o ID de cada uma:

| Etiqueta | Uso |
|---|---|
| `ced_lead_site` | Lead veio do site |
| `ced_email_acesso_enviado` | E-mail de acesso enviado |
| `ced_cliente_fundador_interesse` | Interesse em Cliente Fundador |
| `ced_aguardando_primeiro_acesso` | Ainda não fez primeiro acesso |

Configure:

```env
BOTCONVERSA_CED_TAG_LEAD_SITE_ID=ID_DA_ETIQUETA
BOTCONVERSA_CED_TAG_EMAIL_SENT_ID=ID_DA_ETIQUETA
BOTCONVERSA_CED_TAG_FOUNDER_ID=ID_DA_ETIQUETA
BOTCONVERSA_CED_TAG_WAITING_ACCESS_ID=ID_DA_ETIQUETA
```

---

## 4. Variáveis da AE

No `.env.local` e na Vercel:

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

BOTCONVERSA_CED_SEND_FLOW=false
BOTCONVERSA_CED_FLOW_ID=ID_DO_FLUXO_SE_FOR_USAR
```

Comece com `BOTCONVERSA_CED_SEND_FLOW=false`. Primeiro valide criação de contato, etiquetas e campos. Depois ligue o envio automático do fluxo.

---

## 5. Fluxo recomendado no BotConversa

### Palavra-chave

Condição: **Contém**

Palavras/frases:

- `Corrente em Dia`
- `Preenchi o Quero Conhecer`
- `Código do lead`
- `Continuar meu cadastro pelo WhatsApp`
- `Cliente Fundador`

### Bloco principal

Use um único bloco de conteúdo:

```text
{ced_resp_botconversa}
```

Se preferir montar com campos:

```text
Pronto, {primeiro-nome}. Seu cadastro do Corrente em Dia foi recebido.

Link de acesso:
{ced_login_url}

E-mail usado no cadastro:
{ced_email}

As orientações também foram enviadas para esse e-mail. Se não encontrar a mensagem de acesso, confira também spam/lixo eletrônico.

Se não lembrar a senha, clique em “Esqueci minha senha” na tela de login.

Código do lead:
{ced_lead_id}

Se precisar de ajuda, responda AJUDA por aqui.
```

### Ações após a mensagem

- aplicar etiqueta `ced_whatsapp_iniciado`, se ainda não estiver aplicada;
- aplicar etiqueta `ced_acesso_orientado_whatsapp`;
- notificar equipe/Márcio se desejar acompanhamento manual.

---

## 6. Fluxo AJUDA

Palavra-chave: `AJUDA`

Mensagem:

```text
Claro. Vou te ajudar.

Escolha a etapa:

1 - Não consegui entrar
2 - Não encontrei o e-mail de acesso
3 - Quero completar o cadastro da organização
4 - Quero cadastrar contribuintes
5 - Quero entender Pix/contribuições
6 - Quero falar com a equipe
```

Em todos os casos, lembre a pessoa de procurar o e-mail também em spam/lixo eletrônico antes de solicitar reenvio.

---

## 7. Roteiro de teste

1. Configure `BOTCONVERSA_ENABLED=false` e teste se o formulário segue funcionando.
2. Configure `BOTCONVERSA_ENABLED=true`, API key e endpoint de contato.
3. Preencha um lead pelo site.
4. Verifique no retorno da API `/api/corrente-em-dia/leads` os campos:
   - `botconversaEnabled`
   - `botconversaSynced`
   - `botconversaReason`
   - `botconversaSteps`
5. Abra o contato no BotConversa.
6. Confira campos personalizados.
7. Confira etiquetas.
8. Clique no botão da página Obrigado.
9. Confirme se o fluxo envia a mensagem com URL, e-mail, lead ID e orientação sobre spam/lixo eletrônico.
10. Só depois ative `BOTCONVERSA_CED_SEND_FLOW=true`, se desejar disparo automático de fluxo pela API.

---

## Atualização — debug de campos/etiquetas por ID

A integração AE → BotConversa agora aceita IDs reais e aliases antigos de variáveis. Para o campo de resposta pronta, prefira:

```env
BOTCONVERSA_CED_FIELD_RESPONSE_ID=ID_REAL_DO_CAMPO_CED_RESP_BOTCONVERSA
```

Variáveis antigas como `BOTCONVERSA_CED_FIELD_MESSAGE_ID` continuam funcionando, mas a recomendação nova é `BOTCONVERSA_CED_FIELD_RESPONSE_ID`.

Foi criado o endpoint de teste:

```text
/api/admin/corrente-em-dia/botconversa-test
```

Use com token:

```powershell
Invoke-RestMethod `
  -Uri "https://www.automacaoextrema.com/api/admin/corrente-em-dia/botconversa-test?token=SEU_TOKEN" `
  -Method Get
```

Teste POST:

```powershell
$body = @{
  responsibleName = "Márcio Alexandre da Silva"
  email = "marcioalex.silva@gmail.com"
  whatsapp = "19992360856"
  leadId = "debug-teste-botconversa"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://www.automacaoextrema.com/api/admin/corrente-em-dia/botconversa-test?token=SEU_TOKEN" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Se o campo `ced_resp_botconversa` não for preenchido, ative temporariamente:

```env
BOTCONVERSA_DEBUG=true
```

Depois veja os logs na Vercel em **Deployments → Functions/Logs** e procure por `[BotConversa]`.

O fluxo do BotConversa pode continuar com apenas `{ced_resp_botconversa}`, desde que a API esteja preenchendo esse campo antes de disparar o fluxo. Durante o debug, use uma mensagem fixa com link de login para evitar que o lead fique sem resposta.
