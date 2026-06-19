# Corrente em Dia — BotConversa V2: menor fricção + autoajuda

## Estratégia adotada

Fluxo recomendado:

1. Lead preenche **Quero Conhecer** no site.
2. Sistema cria lead e envia e-mail de acesso.
3. Página **Obrigado** mostra o botão **Continuar seu cadastro pelo WhatsApp**.
4. A mensagem chega pré-preenchida no WhatsApp da Automação Extrema com nome, e-mail, WhatsApp e código do lead.
5. BotConversa responde automaticamente e usa o **Bloco de Integração** para tentar localizar o lead na AE.
6. BotConversa envia as mesmas orientações principais do e-mail, sem perguntar e-mail novamente.
7. Se o lookup não localizar automaticamente, o BotConversa ainda envia o link de login e orienta o lead a usar o e-mail informado no cadastro.
8. Só abre menu de suporte se houver dúvida, erro ou pedido de ajuda.

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
- `ced_resp_botconversa`
- `ced_found`
- `ced_interesse_cliente_fundador`
- `ced_precisa_humano`
- `ced_erro_integracao`

O campo mais importante é:

```text
ced_resp_botconversa
```

Ele recebe a mensagem pronta devolvida pela AE no campo `botconversaMessage`. Assim o texto final não depende de montar várias variáveis no BotConversa.

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

Criar palavra-chave com condição **Contém**, não “Começa com”.

Palavra-chave principal:

- `Corrente em Dia`

Variações úteis:

- `Preenchi o Quero Conhecer do Corrente em Dia`
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

Headers:

```text
Content-Type
application/json
```

Importante: no nome do header use `Content-Type`, sem dois-pontos.

Body recomendado para o fluxo real:

```json
{
  "source": "botconversa_ced_site",
  "whatsapp": "{telefone}"
}
```

Use o seletor de variáveis do BotConversa para inserir `{telefone}`.

### Observação sobre o telefone

O `{telefone}` é o telefone do contato que está conversando com o WhatsApp da AE. Ele pode ser diferente do telefone informado no formulário.

Por isso, o endpoint da AE foi ajustado para procurar o WhatsApp de forma flexível, aceitando formatos como:

```text
19992360856
5519992360856
+55 19 99236-0856
(19) 99236-0856
```

Se ainda assim não localizar, o BotConversa não deve pedir para preencher o Quero Conhecer novamente. Ele deve enviar o link de login e orientar a pessoa a usar o e-mail informado no cadastro.

---

## Mapeamento de resposta

Na aba **Mapeamento de resposta**, configure:

```text
botconversaMessage -> ced_resp_botconversa
found               -> ced_found
name                -> ced_nome_contato
email               -> ced_email
whatsapp            -> ced_whatsapp
leadId              -> ced_lead_id
loginUrl            -> ced_login_url
status              -> ced_status
```

Depois do Bloco de Integração, o próximo bloco de conteúdo deve enviar somente:

```text
{ced_resp_botconversa}
```

Use o seletor de variáveis do BotConversa para inserir `ced_resp_botconversa`.

---

## Saídas do Bloco de Integração

Conecte apenas:

```text
Em resposta com sucesso -> Conteúdo com {ced_resp_botconversa}
```

Deixe desconectada a saída:

```text
Continuar sem esperar resposta
```

Se conectar as duas saídas, o lead pode receber mensagens duplicadas ou contraditórias.

---

## Mensagem quando localizar o lead

Esta mensagem não precisa ser escrita no BotConversa. Ela vem pronta da AE pelo campo `botconversaMessage`.

Exemplo do texto devolvido pela AE:

```text
Pronto, Márcio. Localizei seu cadastro no Corrente em Dia.

Seu acesso inicial já foi preparado para você começar a configuração da organização.

Link de acesso:
https://www.automacaoextrema.com/solucoes/corrente-em-dia/login

E-mail usado no cadastro:
marcioalex.silva@gmail.com

As orientações também foram enviadas para esse e-mail. Se não encontrar a mensagem de acesso, confira também spam/lixo eletrônico.

Se já tiver senha, use sua senha atual. Se não lembrar, clique em "Esqueci minha senha" na tela de login.

Próximo passo:
entre no sistema, complete o cadastro da organização, configure Pix, contribuições, funções e contribuintes.

Se tiver qualquer dificuldade, responda AJUDA por aqui.
```

---

## Mensagem quando não localizar automaticamente

Esta mensagem também vem pronta da AE pelo campo `botconversaMessage`.

Exemplo:

```text
Não consegui localizar automaticamente seu cadastro agora, mas seu atendimento ficou salvo por aqui.

As orientações de acesso foram enviadas para o e-mail informado no formulário do Corrente em Dia.

Acesse:
https://www.automacaoextrema.com/solucoes/corrente-em-dia/login

Use o e-mail informado no cadastro. Se não encontrar a mensagem de acesso, confira também spam/lixo eletrônico.

Se já tiver senha, use sua senha atual. Se não lembrar, clique em "Esqueci minha senha" na tela de login.

Se precisar de ajuda, responda AJUDA por aqui.
```

---

## Bloco após a mensagem `{ced_resp_botconversa}`

Adicionar etiquetas:

- `ced_acesso_orientado_whatsapp`
- `ced_email_acesso_enviado`
- `ced_aguardando_primeiro_acesso`

Definir campos:

- `ced_status = orientacoes_enviadas_whatsapp`

Notificar Márcio/equipe:

```text
Novo atendimento Corrente em Dia pelo WhatsApp.

Telefone do contato no BotConversa: {telefone}
Status: {ced_status}
Lead localizado: {ced_found}
E-mail: {ced_email}
Lead: {ced_lead_id}

A pessoa recebeu as orientações de acesso pelo WhatsApp. Acompanhar primeiro acesso.
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
2 - Não encontrei o e-mail de acesso
3 - Quero completar o cadastro da organização
4 - Quero cadastrar contribuintes
5 - Quero entender Pix/contribuições
6 - Quero falar com a equipe
```

### Respostas sugeridas

#### 1 - Não consegui entrar

```text
Sem problema. Primeiro confira se está usando o mesmo e-mail informado no cadastro.

Link de acesso:
https://www.automacaoextrema.com/solucoes/corrente-em-dia/login

Se não encontrar o e-mail de acesso, confira também spam/lixo eletrônico.

Se não lembrar a senha, clique em "Esqueci minha senha" na tela de login. Se ainda assim não conseguir, vou acionar a equipe para verificar seu acesso.
```

Etiqueta: `ced_precisa_humano` se a pessoa insistir que não conseguiu.

#### 2 - Não encontrei o e-mail de acesso

```text
Sem problema. Confira também spam/lixo eletrônico.

Você pode acessar diretamente por aqui:
https://www.automacaoextrema.com/solucoes/corrente-em-dia/login

Use o e-mail informado no cadastro. Se não lembrar a senha, clique em "Esqueci minha senha".

Se ainda assim não conseguir, responda com o e-mail que usou no cadastro ou envie o Código do lead para a equipe verificar.
```

#### 3 - Quero completar o cadastro da organização

```text
Dentro do Corrente em Dia, entre em CADASTRO.

Complete primeiro: nome da organização, responsável, chave Pix, valor padrão e dia de contribuição. Esses dados reduzem dúvidas antes de liberar o uso para todos.
```

#### 4 - Quero cadastrar contribuintes

```text
Entre em CONTRIBUINTES.

Você pode cadastrar poucas pessoas de teste primeiro, conferir função, valor e dia combinado, e depois importar a lista completa por planilha.
```

#### 5 - Quero entender Pix/contribuições

```text
A tela CONTRIBUIR mostra QR Code, Pix copia e cola, valor combinado, vencimento e envio de comprovante.

A recomendação é fazer uma contribuição de teste antes de liberar para todos.
```

#### 6 - Quero falar com a equipe

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

## Testes recomendados

### Teste 1 — GET no navegador

Acesse:

```text
https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup
```

Deve retornar instruções do endpoint.

### Teste 2 — BotConversa com número fixo

No body do Bloco de Integração, teste temporariamente:

```json
{
  "source": "botconversa_teste",
  "whatsapp": "19992360856"
}
```

Depois teste:

```json
{
  "source": "botconversa_teste",
  "whatsapp": "5519992360856"
}
```

Os dois formatos devem localizar o mesmo lead, se o número existir na base.

### Teste 3 — BotConversa com variável

Volte o body para:

```json
{
  "source": "botconversa_ced_site",
  "whatsapp": "{telefone}"
}
```

Teste pelo fluxo real, não apenas pelo botão **Testar Requisição**, porque o teste pode não ter contexto real de contato.

---

## Importante sobre autoajuda

O BotConversa deve ser continuação do sistema, não mais uma barreira. Por isso:

- não perguntar e-mail novamente quando a mensagem veio do botão do site;
- enviar orientações direto;
- abrir menu só em caso de ajuda;
- usar tom de clareza, segurança e cuidado coletivo;
- orientar a procurar o e-mail também em spam/lixo eletrônico;
- evitar linguagem de cobrança.
