# Corrente em Dia — BotConversa V3: menor fricção + AE → BotConversa API

## Estratégia adotada

Fluxo recomendado:

1. Lead preenche **Quero Conhecer** no site.
2. Sistema cria lead, cliente provisório e acesso inicial.
3. Sistema envia e-mail de acesso.
4. Sistema chama a **API do BotConversa** para enriquecer o contato automaticamente.
5. Página **Obrigado** mostra o botão **Continuar seu cadastro pelo WhatsApp**.
6. Quando o lead envia a mensagem ao WhatsApp da AE, o BotConversa já deve ter campos, etiquetas e mensagem pronta.
7. O fluxo responde com as orientações principais, sem perguntar e-mail novamente.
8. Menu de suporte só aparece quando a pessoa responder **AJUDA**.

Essa estratégia reduz fricção porque a pessoa não precisa responder um menu logo após clicar no botão, e também reduz dependência do lookup por `{telefone}`.

---

## Campos personalizados no BotConversa

Crie os campos abaixo:

- `ced_nome_contato`
- `ced_email`
- `ced_whatsapp`
- `ced_lead_id`
- `ced_origem`
- `ced_status`
- `ced_login_url`
- `ced_interesse_cliente_fundador`
- `ced_precisa_humano`
- `ced_erro_integracao`
- `ced_acesso_email_enviado`
- `ced_primeiro_acesso_status`
- `ced_resp_botconversa`

O campo mais importante para simplificar o fluxo é `ced_resp_botconversa`, porque ele recebe da AE a mensagem completa pronta para enviar ao lead.

---

## Etiquetas

Crie:

- `ced_lead_site`
- `ced_whatsapp_iniciado`
- `ced_acesso_orientado_whatsapp`
- `ced_email_acesso_enviado`
- `ced_cliente_fundador_interesse`
- `ced_integracao_ae_ok`
- `ced_integracao_ae_erro`
- `ced_precisa_humano`
- `ced_aguardando_primeiro_acesso`
- `ced_ajuda_solicitada`

---

## Chave API do BotConversa

No BotConversa:

1. Acesse **Configurações**.
2. Acesse **Integrações**.
3. Copie a chave **Webhook Integration**.
4. Configure na AE como `BOTCONVERSA_API_KEY`.
5. Na documentação autenticada da API do BotConversa, confirme os IDs dos campos, etiquetas e fluxo.

---

## Fluxo principal: CED - Lead vindo do site

### Palavra-chave principal

Criar palavra-chave com condição **Contém**:

- `Corrente em Dia`
- `Preenchi o Quero Conhecer`
- `Código do lead`
- `Quero receber as orientações de acesso`
- `Cliente Fundador`
- `Continuar meu cadastro`
- `Continuar seu cadastro pelo WhatsApp`

Ação: iniciar fluxo **CED - Lead vindo do site**.

---

## Bloco principal do fluxo

Com AE → BotConversa API funcionando, o fluxo pode ter apenas este conteúdo:

```text
{ced_resp_botconversa}
```

Use o seletor de variáveis do BotConversa para inserir o campo, em vez de digitar manualmente.

Se preferir não usar `ced_resp_botconversa`, monte o texto com campos:

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

Não enviar senha temporária por WhatsApp na V1. Use o e-mail e a opção “Esqueci minha senha” por segurança.

---

## Ações após a mensagem principal

Adicionar etiquetas:

- `ced_whatsapp_iniciado`
- `ced_acesso_orientado_whatsapp`

Definir campos, se desejar:

- `ced_status = orientacoes_enviadas_whatsapp`

Notificar Márcio/equipe, se fizer sentido:

```text
Novo atendimento Corrente em Dia pelo WhatsApp.

Nome: {ced_nome_contato}
E-mail: {ced_email}
Lead: {ced_lead_id}
Status: {ced_status}

A pessoa recebeu as orientações de acesso pelo WhatsApp. Acompanhar primeiro acesso.
```

---

## Bloco de Integração ainda é necessário?

No fluxo principal, não é obrigatório se a AE já estiver enriquecendo o contato via API.

Mantenha o Bloco de Integração apenas como contingência ou diagnóstico, por exemplo em um fluxo de suporte.

Endpoint de consulta:

```text
POST https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup
```

Body:

```json
{
  "source": "botconversa_ced_site",
  "whatsapp": "{telefone}"
}
```

O endpoint sempre devolve `botconversaMessage`, inclusive quando não localiza o cadastro. O fallback nunca deve pedir para preencher novamente o Quero Conhecer; ele deve enviar URL de login e orientar a procurar o e-mail em spam/lixo eletrônico.

---

## Fluxo de suporte: palavra-chave AJUDA

Criar palavra-chave:

- `AJUDA`

Resposta:

```text
Claro. Vou te ajudar.

Para começar, me diga em qual etapa você está:

1 - Não consegui entrar
2 - Não encontrei o e-mail de acesso
3 - Quero completar o cadastro da organização
4 - Quero cadastrar contribuintes
5 - Quero entender Pix/contribuições
6 - Quero falar com a equipe
```

### 1 - Não consegui entrar

```text
Sem problema. Primeiro confira se está usando o mesmo e-mail informado no cadastro.

Link de acesso:
{ced_login_url}

Se não encontrar a mensagem de acesso, confira também spam/lixo eletrônico.

Se não lembrar a senha, clique em Esqueci minha senha na tela de login. Se ainda assim não conseguir, vou acionar a equipe para verificar seu acesso.
```

### 2 - Não encontrei o e-mail de acesso

```text
Sem problema. Confira também a pasta spam/lixo eletrônico.

Link de acesso:
{ced_login_url}

Use o e-mail informado no cadastro. Se não lembrar a senha, clique em Esqueci minha senha na tela de login.

Se preferir, vou sinalizar para a equipe acompanhar seu acesso por aqui.
```

### 3 - Quero completar o cadastro da organização

```text
Dentro do Corrente em Dia, entre em CADASTRO.

Complete primeiro: nome da organização, responsável, chave Pix, valor padrão e dia de contribuição. Esses dados reduzem dúvidas antes de liberar o uso para todos.
```

### 4 - Quero cadastrar contribuintes

```text
Entre em CONTRIBUINTES.

Você pode cadastrar poucas pessoas de teste primeiro, conferir função, valor e dia combinado, e depois importar a lista completa por planilha.
```

### 5 - Quero entender Pix/contribuições

```text
A tela CONTRIBUIR mostra QR Code, Pix copia e cola, valor combinado, vencimento e envio de comprovante.

A recomendação é fazer uma contribuição de teste antes de liberar para todos.
```

### 6 - Quero falar com a equipe

```text
Perfeito. Vou sinalizar para a equipe da Automação Extrema continuar seu atendimento por aqui.
```

Etiqueta: `ced_precisa_humano`.

---

## Fluxo de não resposta

Se o usuário não responder depois da orientação automática:

Aguardar 30 a 60 minutos e enviar:

```text
Vou deixar seu atendimento salvo por aqui.

Quando quiser continuar, entre pelo link enviado e complete os primeiros passos. Se não encontrar o e-mail de acesso, confira também spam/lixo eletrônico. Se precisar de ajuda, responda AJUDA.
```

Etiqueta: `ced_aguardando_primeiro_acesso`.

---

## Importante sobre autoajuda

O BotConversa deve ser continuação do sistema, não mais uma barreira. Por isso:

- não perguntar e-mail novamente quando a mensagem veio do botão do site;
- enviar orientações direto;
- exibir URL de login;
- citar spam/lixo eletrônico;
- abrir menu só em caso de ajuda;
- usar tom de clareza, segurança e cuidado coletivo;
- evitar linguagem de cobrança;
- não enviar senha temporária por WhatsApp.
