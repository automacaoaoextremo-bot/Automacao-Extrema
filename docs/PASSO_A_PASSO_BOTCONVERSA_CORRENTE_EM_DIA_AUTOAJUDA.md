# Corrente em Dia — BotConversa V2: menor fricção + autoajuda

## Estratégia adotada

Fluxo recomendado:

1. Lead preenche **Quero Conhecer** no site.
2. Sistema cria lead e envia e-mail de acesso.
3. Página **Obrigado** mostra o botão **Continuar seu cadastro pelo WhatsApp**.
4. A mensagem chega pré-preenchida no WhatsApp da Automação Extrema com nome, e-mail, WhatsApp e código do lead.
5. BotConversa responde automaticamente e, se possível, usa **Bloco de Integração** para buscar os dados do lead na AE.
6. BotConversa envia as mesmas orientações principais do e-mail, sem perguntar e-mail novamente.
7. Só abre menu de suporte se houver erro, dúvida ou pedido de ajuda.

Essa estratégia reduz a fricção porque a pessoa não precisa responder um menu logo após clicar no botão.

---

## Campos personalizados no BotConversa

Crie os campos:

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

Nem todos precisam ser preenchidos manualmente no início. Eles podem ser alimentados pelo Bloco de Integração quando a AE devolver os dados.

---

## Etiquetas

Crie:

- `ced_lead_site`
- `ced_whatsapp_iniciado`
- `ced_acesso_orientado_whatsapp`
- `ced_email_acesso_enviado`
- `ced_cliente_fundador_interesse`
- `ced_integracao_ok`
- `ced_integracao_erro`
- `ced_precisa_humano`
- `ced_aguardando_primeiro_acesso`
- `ced_ajuda_solicitada`

---

## Palavra-chave principal

Criar palavra-chave:

- `Corrente em Dia`

Variações úteis:

- `Código do lead`
- `Quero receber as orientações de acesso`
- `Cliente Fundador`
- `Continuar meu cadastro`
- `Continuar seu cadastro pelo WhatsApp`

Ação: iniciar fluxo **CED - Lead vindo do site V2**.

---

## Fluxo principal: CED - Lead vindo do site V2

### Bloco 1 — mensagem inicial

Texto:

```text
Olá! Recebi seu cadastro do Corrente em Dia.

Vou localizar suas informações e te enviar por aqui as orientações principais para continuar seu acesso, sem precisar preencher tudo de novo.

A ideia é começar com calma, organizar contribuições, comprovantes e pendências, e trazer mais clareza para quem cuida da organização.
```

### Bloco 2 — ações

Adicionar etiquetas:

- `ced_lead_site`
- `ced_whatsapp_iniciado`
- `ced_cliente_fundador_interesse`

Definir campos:

- `ced_origem = site_corrente_em_dia`
- `ced_status = whatsapp_iniciado`

### Bloco 3 — Bloco de Integração

Use **Bloco de Integração**, não Webhook.

O Webhook do BotConversa é útil quando outro sistema chama o BotConversa. Neste fluxo, quem precisa consultar dados é o próprio fluxo do BotConversa, então use Bloco de Integração.

Método:

```text
POST
```

URL produção:

```text
https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup
```

Body recomendado se conseguir capturar o código do lead:

```json
{
  "leadId": "{{ced_lead_id}}",
  "whatsapp": "{{contact.phone}}",
  "source": "botconversa_ced_site"
}
```

Body alternativo, se ainda não conseguir extrair o código:

```json
{
  "whatsapp": "{{contact.phone}}",
  "source": "botconversa_ced_site"
}
```

### Bloco 4 — se integração localizar o lead

Salvar retorno nos campos:

- `ced_nome_contato = responsibleName`
- `ced_email = accessEmail`
- `ced_whatsapp = whatsapp`
- `ced_lead_id = leadId`
- `ced_login_url = loginUrl`
- `ced_status = status`

Adicionar etiquetas:

- `ced_integracao_ok`
- `ced_acesso_orientado_whatsapp`
- `ced_email_acesso_enviado`
- `ced_aguardando_primeiro_acesso`

Mensagem:

```text
Pronto, {{ced_nome_contato}}. Localizei seu cadastro no Corrente em Dia.

Seu acesso inicial já foi preparado para você começar a configuração da organização.

Link de acesso:
{{ced_login_url}}

E-mail usado no cadastro:
{{ced_email}}

As orientações também foram enviadas para esse e-mail. Se não encontrar, confira spam/lixo eletrônico. Se já tiver senha, use sua senha atual. Se não lembrar, clique em Esqueci minha senha na tela de login.

Próximo passo:
entre no sistema, complete o cadastro da organização, configure Pix, contribuições, funções e contribuintes.

Se tiver qualquer dificuldade, responda AJUDA por aqui.
```

Não enviar senha temporária por WhatsApp na V1. Use o e-mail e a opção “Esqueci minha senha” por segurança.

### Bloco 5 — se integração não localizar

Adicionar etiquetas:

- `ced_integracao_erro`
- `ced_precisa_humano`

Definir campos:

- `ced_precisa_humano = sim`
- `ced_status = verificar_acesso_manual`

Mensagem:

```text
Não consegui localizar automaticamente seu cadastro agora.

Mas não se preocupe: seu atendimento ficou salvo por aqui.

Vou sinalizar para a equipe da Automação Extrema verificar seu acesso e continuar o atendimento por este WhatsApp.
```

Notificar Márcio/equipe:

```text
Novo atendimento Corrente em Dia com necessidade de verificação manual.

Verificar cadastro, acesso e e-mail do lead.
```

---

## Fluxo de suporte: palavra-chave AJUDA

Criar palavra-chave:

- `AJUDA`

Resposta:

```text
Claro. Vou te ajudar.

Para começar, me diga em qual etapa você está:

1 - Não consegui entrar
2 - Quero completar o cadastro da organização
3 - Quero cadastrar contribuintes
4 - Quero entender Pix/contribuições
5 - Quero falar com a equipe
```

### Respostas sugeridas

#### 1 - Não consegui entrar

```text
Sem problema. Primeiro confira se está usando o mesmo e-mail informado no cadastro.

Link de acesso:
{{ced_login_url}}

Se não lembrar a senha, clique em Esqueci minha senha na tela de login. Se ainda assim não conseguir, vou acionar a equipe para verificar seu acesso.
```

Etiqueta: `ced_precisa_humano` se a pessoa insistir que não conseguiu.

#### 2 - Quero completar o cadastro da organização

```text
Dentro do Corrente em Dia, entre em CADASTRO.

Complete primeiro: nome da organização, responsável, chave Pix, valor padrão e dia de contribuição. Esses dados reduzem dúvidas antes de liberar o uso para todos.
```

#### 3 - Quero cadastrar contribuintes

```text
Entre em CONTRIBUINTES.

Você pode cadastrar poucas pessoas de teste primeiro, conferir função, valor e dia combinado, e depois importar a lista completa por planilha.
```

#### 4 - Quero entender Pix/contribuições

```text
A tela CONTRIBUIR mostra QR Code, Pix copia e cola, valor combinado, vencimento e envio de comprovante.

A recomendação é fazer uma contribuição de teste antes de liberar para todos.
```

#### 5 - Quero falar com a equipe

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

Quando quiser continuar, entre pelo link enviado e complete os primeiros passos. Se precisar de ajuda, responda AJUDA.
```

Etiqueta: `ced_aguardando_primeiro_acesso`.

---

## Importante sobre autoajuda

O BotConversa deve ser continuação do sistema, não mais uma barreira. Por isso:

- não perguntar e-mail novamente quando a mensagem veio do botão do site;
- enviar orientações direto;
- abrir menu só em caso de ajuda;
- usar tom de clareza, segurança e cuidado coletivo;
- evitar linguagem de cobrança.
