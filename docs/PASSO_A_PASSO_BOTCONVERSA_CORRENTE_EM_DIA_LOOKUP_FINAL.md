# Corrente em Dia — BotConversa lookup final

## Objetivo

Garantir que o fluxo **CED - Lead vindo do site** funcione assim:

1. Lead preenche **Quero Conhecer** no site.
2. Página **Obrigado** abre WhatsApp da AE com mensagem pré-preenchida.
3. BotConversa identifica a mensagem pelo conteúdo.
4. BotConversa chama a AE pelo bloco de integração.
5. AE devolve uma única mensagem pronta no campo `botconversaMessage`.
6. BotConversa envia essa mensagem ao lead.
7. Se o lead não for localizado, a própria mensagem já orienta que a equipe continuará o atendimento.

---

## Correções no sistema AE

### 1. Número de destino do WhatsApp

O botão **Continuar seu cadastro pelo WhatsApp** deve enviar sempre para o WhatsApp da AE:

```text
5519989848246
```

O WhatsApp do lead continua indo dentro do texto da mensagem, apenas como informação para identificação do cadastro.

### 2. Endpoint de lookup

URL:

```text
https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup
```

O endpoint agora retorna HTTP 200 mesmo quando:

- o BotConversa testa com variável literal, como `{{telefone}}`;
- o lead não é localizado;
- ocorre erro interno de consulta.

Isso evita que o bloco de integração quebre o fluxo. O retorno sempre inclui:

```text
botconversaMessage
```

Esse é o campo principal que deve ser mapeado no BotConversa.

---

## Configuração da palavra-chave

Em **Automação > Palavras-chave**, configure o fluxo:

```text
CED - Lead vindo do site
```

Condição:

```text
Contém
```

Palavras/frases recomendadas:

```text
Preenchi o Quero Conhecer do Corrente em Dia
Corrente em Dia
Código do lead
Quero receber as orientações de acesso
Continuar meu cadastro pelo WhatsApp
Cliente Fundador
```

A condição **Começa com** não deve ser usada neste caso, porque a mensagem do botão começa com:

```text
Olá! Preenchi o Quero Conhecer...
```

---

## Estrutura recomendada do fluxo

### Bloco 1 — Conteúdo inicial

```text
Olá! Recebi seu cadastro do Corrente em Dia.

Vou localizar suas informações e te enviar por aqui as orientações principais para continuar seu acesso, sem precisar preencher tudo de novo.

A ideia é começar com calma, organizar contribuições, comprovantes e pendências, e trazer mais clareza para quem cuida da organização.
```

### Bloco 2 — Ações

Adicionar etiquetas:

```text
ced_lead_site
ced_whatsapp_iniciado
ced_cliente_fundador_interesse
```

Definir campos:

```text
ced_origem = site_corrente_em_dia
ced_status = whatsapp_iniciado
```

### Bloco 3 — Integração

Tipo:

```text
POST
```

URL:

```text
https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup
```

Headers:

```text
Content-Type: application/json
```

Body recomendado:

```json
{
  "source": "botconversa_ced_site",
  "whatsapp": "{{telefone}}"
}
```

Observação: use a variável real do telefone pelo seletor do BotConversa. Em algumas contas, o nome da variável pode ser diferente de `{{telefone}}`.

### Saídas da integração

Conecte somente:

```text
Em resposta com sucesso -> Conteúdo com {{ced_resp_botconversa}}
```

Não conecte:

```text
Continuar sem esperar resposta
```

Se as duas saídas forem conectadas, o lead pode receber mensagem de sucesso e mensagem de erro no mesmo atendimento.

---

## Mapeamento de resposta

Na aba **Mapeamento de resposta**, crie pelo menos:

```text
botconversaMessage -> ced_resp_botconversa
found -> ced_found
name -> ced_nome_contato
email -> ced_email
leadId -> ced_lead_id
loginUrl -> ced_login_url
status -> ced_status
```

Campo principal para envio ao lead:

```text
ced_resp_botconversa
```

---

## Bloco de conteúdo após a integração

O bloco seguinte deve enviar apenas o campo mapeado.

Use o seletor de variável do BotConversa para inserir:

```text
ced_resp_botconversa
```

Dependendo da tela, o BotConversa pode mostrar algo como:

```text
{{ced_resp_botconversa}}
```

ou

```text
{ced_resp_botconversa}
```

O mais seguro é inserir pelo seletor de campos/variáveis, e não digitando manualmente.

---

## Onde fica o texto ideal que a AE devolve?

O texto fica no próprio endpoint da AE:

```text
src/app/api/corrente-em-dia/leads/lookup/route.ts
```

Quando o cadastro é localizado, a AE devolve no campo `botconversaMessage`:

```text
Pronto, [nome]. Localizei seu cadastro no Corrente em Dia.

Seu acesso inicial já foi preparado para você começar a configuração da organização.

Link de acesso: https://www.automacaoextrema.com/solucoes/corrente-em-dia/login
E-mail usado no cadastro: [email]

As orientações também foram enviadas para esse e-mail. Se não encontrar, confira spam/lixo eletrônico.

Se já tiver senha, use sua senha atual. Se não lembrar, clique em Esqueci minha senha na tela de login.

Próximo passo: entre no sistema, complete o cadastro da organização, configure Pix, contribuições, funções e contribuintes.

Se tiver qualquer dificuldade, responda AJUDA por aqui.
```

Quando não localiza, a AE devolve no mesmo campo:

```text
Não consegui localizar automaticamente seu cadastro agora.

Mas não se preocupe: seu atendimento ficou salvo por aqui.

Vou sinalizar para a equipe da Automação Extrema verificar seu acesso e continuar o atendimento.

Se preferir, você também pode preencher novamente o Quero Conhecer pelo site: https://www.automacaoextrema.com/solucoes/corrente-em-dia/quero-conhecer
```

Portanto, no BotConversa não é necessário criar dois textos diferentes para sucesso e erro nesta primeira versão. Basta enviar `ced_resp_botconversa`.

---

## Ações após enviar a resposta

Depois do conteúdo `ced_resp_botconversa`, adicionar:

```text
Etiqueta: ced_acesso_orientado_whatsapp
Etiqueta: ced_email_acesso_enviado
Campo ced_status = orientacoes_enviadas_whatsapp
```

Notificar equipe:

```text
Novo atendimento Corrente em Dia pelo WhatsApp.

Nome: {{ced_nome_contato}}
E-mail: {{ced_email}}
Lead: {{ced_lead_id}}
Status: {{ced_status}}

A pessoa recebeu as orientações pelo WhatsApp. Acompanhar primeiro acesso.
```

---

## Palavra-chave AJUDA

Criar palavra-chave separada:

```text
AJUDA
```

Resposta:

```text
Claro. Vou te ajudar.

Escolha a etapa:

1 - Não consegui entrar
2 - Quero completar o cadastro da organização
3 - Quero cadastrar contribuintes
4 - Quero entender Pix/contribuições
5 - Quero falar com a equipe
```

Esse menu só deve aparecer quando a pessoa pedir ajuda.

---

## Checklist de teste

1. Fazer deploy do código atualizado na Vercel.
2. Abrir:

```text
https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup
```

Deve retornar JSON com `ok: true`.

3. No BotConversa, testar requisição com body:

```json
{
  "source": "botconversa_ced_site",
  "whatsapp": "{{telefone}}"
}
```

Mesmo com variável literal no teste, o endpoint deve retornar HTTP 200 e campo `botconversaMessage`.

4. Preencher um novo lead no site.
5. Clicar em **Continuar seu cadastro pelo WhatsApp**.
6. Confirmar que o WhatsApp abre para:

```text
5519989848246
```

7. Enviar a mensagem pré-preenchida.
8. Confirmar que o fluxo inicia sem digitar “Corrente em Dia” manualmente.
9. Confirmar que o BotConversa envia a mensagem mapeada de `ced_resp_botconversa`.
10. Confirmar que não envia mensagem de sucesso e erro no mesmo atendimento.
