# Corrente em Dia — BotConversa atualizado

## Estratégia aprovada

Fluxo principal da V1:

1. Lead acessa a página `Quero Conhecer`.
2. Informa somente:
   - Nome do contato;
   - WhatsApp;
   - E-mail.
3. O sistema cria o lead e prepara o acesso inicial.
4. O lead vai para a página `Obrigado`.
5. O lead toca no botão **Continuar seu cadastro pelo WhatsApp**.
6. O WhatsApp abre com mensagem pré-preenchida contendo:
   - Nome do contato;
   - WhatsApp;
   - E-mail;
   - Código do lead;
   - Interesse em seguir como Cliente Fundador.
7. O BotConversa responde automaticamente e aplica etiquetas.
8. O atendimento continua pelo WhatsApp da Automação Extrema.

Essa estratégia reduz fricção, evita pedir dados demais no primeiro contato e usa o WhatsApp como canal principal de continuidade.

---

## Conceito comercial usado nos textos

A lógica das mensagens segue a abordagem de Deep Dive:

- não vender “sistema”;
- influenciar o lead a querer clareza, previsibilidade, segurança e menos retrabalho;
- mostrar que o Corrente em Dia tira contribuições e comprovantes dos controles soltos;
- reforçar que a entrada como Cliente Fundador é uma oportunidade de participar da construção da solução.

---

## O que usar no BotConversa

## 1. Campos personalizados

Crie em **Configurações > Campos Personalizados**:

```txt
ced_nome_contato
ced_email
ced_whatsapp
ced_lead_id
ced_origem
ced_status
ced_cliente_fundador
ced_observacao_atendimento
```

Uso sugerido:

| Campo | Uso |
|---|---|
| `ced_nome_contato` | Nome capturado do texto vindo do botão do site ou digitado no fluxo |
| `ced_email` | E-mail do cadastro |
| `ced_whatsapp` | WhatsApp informado no cadastro |
| `ced_lead_id` | Código do lead enviado pelo site |
| `ced_origem` | site, email, whatsapp direto, indicação |
| `ced_status` | novo, acesso enviado, em atendimento, aguardando retorno |
| `ced_cliente_fundador` | sim/não/em validação |
| `ced_observacao_atendimento` | observações do atendimento |

---

## 2. Etiquetas

Crie em **Contatos > Etiquetas** ou na área equivalente:

```txt
ced_novo_lead_site
ced_cliente_fundador_interesse
ced_acesso_enviado
ced_atendimento_iniciado
ced_aguardando_resposta
ced_precisa_humano
ced_em_implantacao
ced_teste_30_dias
```

Uso sugerido:

| Etiqueta | Quando aplicar |
|---|---|
| `ced_novo_lead_site` | contato veio do botão da página Obrigado |
| `ced_cliente_fundador_interesse` | contato declarou interesse em Cliente Fundador |
| `ced_acesso_enviado` | e-mail/acesso já foi preparado pelo sistema |
| `ced_atendimento_iniciado` | BotConversa iniciou atendimento |
| `ced_aguardando_resposta` | aguardando resposta do contato |
| `ced_precisa_humano` | quando pedir suporte humano ou houver dúvida |
| `ced_em_implantacao` | quando começou configuração da organização |
| `ced_teste_30_dias` | quando iniciou avaliação de 30 dias |

---

## 3. Palavras-chave

Crie em **Automação > Palavras-chave**:

### Palavra-chave 1
```txt
Corrente em Dia
```

### Palavra-chave 2
```txt
Continuar meu cadastro
```

### Palavra-chave 3
```txt
Cliente Fundador
```

### Palavra-chave 4
```txt
Código do lead
```

### Palavra-chave 5
```txt
Quero receber as orientações de acesso
```

Todas devem iniciar o fluxo:

```txt
CED - Lead vindo do site
```

---

# Fluxo 1 — CED - Lead vindo do site

## Quando usar

Use quando o contato chegar pelo botão **Continuar seu cadastro pelo WhatsApp** da página Obrigado.

A mensagem já vem com os dados principais. Portanto, **não precisa perguntar o e-mail novamente**.

## Bloco 1 — mensagem inicial

```txt
Olá! Que bom receber seu interesse no Corrente em Dia.

Vi que você veio pelo cadastro do site. Isso já ajuda a manter tudo organizado desde o primeiro contato.

A proposta agora é simples: confirmar seu acesso, tirar dúvidas e ajudar sua organização a iniciar a avaliação como Cliente Fundador, com mais clareza nas contribuições, comprovantes organizados e menos retrabalho para quem cuida da casa.
```

## Ações do bloco

Aplicar etiquetas:

```txt
ced_novo_lead_site
ced_atendimento_iniciado
ced_cliente_fundador_interesse
```

Se possível, preencher manualmente ou automaticamente campos:

```txt
ced_origem = site_corrente_em_dia
ced_status = atendimento_iniciado
```

## Bloco 2 — mensagem de orientação

```txt
As orientações de acesso também foram preparadas para o e-mail informado no formulário.

Por aqui no WhatsApp vamos acompanhar os próximos passos, porque fica mais fácil confirmar dados, tirar dúvidas e orientar o primeiro uso.

Se você já recebeu o e-mail, pode acessar o painel. Se ainda não encontrou, confira a caixa de entrada e spam/lixo eletrônico. Mesmo assim, pode seguir por aqui que vamos te orientar.
```

## Bloco 3 — pergunta de continuidade

```txt
Para eu te direcionar melhor, escolha uma opção:

1 - Já recebi o e-mail de acesso
2 - Ainda não encontrei o e-mail
3 - Quero falar com uma pessoa da AE
```

## Condições

### Resposta 1
Aplicar etiqueta:

```txt
ced_acesso_enviado
```

Responder:

```txt
Perfeito. Então o próximo passo é acessar o painel e completar os dados da organização.

No primeiro acesso, você confirma as informações principais, LGPD e a condição de Cliente Fundador. A ideia é começar simples e evoluir conforme a rotina real da sua organização.
```

### Resposta 2
Aplicar etiqueta:

```txt
ced_precisa_humano
```

Responder:

```txt
Sem problema. Vamos conferir isso para você.

Enquanto isso, confirme se o e-mail informado no cadastro está correto na mensagem acima. Se estiver correto, nossa equipe verifica o envio e te orienta por aqui.
```

### Resposta 3
Aplicar etiqueta:

```txt
ced_precisa_humano
```

Responder:

```txt
Combinado. Vou direcionar seu atendimento para uma pessoa da Automação Extrema.

A ideia é te ajudar a começar sem complicar: primeiro o acesso, depois os dados da organização e, em seguida, a configuração inicial para a avaliação de 30 dias.
```

---

# Fluxo 2 — CED - Interesse direto pelo WhatsApp

## Quando usar

Use quando alguém chama no WhatsApp sem ter preenchido o formulário do site.

Exemplos:

```txt
Quero conhecer o Corrente em Dia
Tenho interesse no Cliente Fundador
Como funciona para terreiro?
```

## Bloco 1 — mensagem inicial

```txt
Olá! Que bom saber do seu interesse no Corrente em Dia.

A solução foi pensada para ajudar organizações a sair dos controles soltos, comprovantes espalhados e lembretes manuais, trazendo mais clareza, previsibilidade e tranquilidade para quem cuida das contribuições.

Para liberar o primeiro acesso, preciso apenas de três informações.
```

## Bloco 2 — perguntas

Perguntar e salvar:

```txt
Nome do contato
WhatsApp
E-mail
```

Campos:

```txt
ced_nome_contato
ced_whatsapp
ced_email
```

## Bloco 3 — bloco de integração

Use o **Bloco de Integração** para enviar os dados para a AE.

Método:

```txt
POST
```

URL de produção:

```txt
https://www.automacaoextrema.com/api/corrente-em-dia/leads
```

Headers:

```txt
Content-Type: application/json
```

Body sugerido:

```json
{
  "source": "botconversa_whatsapp_direto",
  "contactName": "{{ced_nome_contato}}",
  "responsibleName": "{{ced_nome_contato}}",
  "whatsapp": "{{ced_whatsapp}}",
  "email": "{{ced_email}}",
  "founderTermsAccepted": false,
  "testimonialPermission": false,
  "lgpdContactConsent": false,
  "observations": "Lead criado pelo BotConversa. Dados completos serão confirmados na área logada."
}
```

> Observação: confirme no BotConversa a sintaxe exata das variáveis. Em algumas telas é necessário inserir a variável pelo seletor visual em vez de digitar `{{campo}}`.

## Bloco 4 — resposta após integração

```txt
Pronto. Seu interesse foi registrado.

O acesso inicial será preparado para o e-mail informado e a continuidade pode seguir por aqui no WhatsApp.

O objetivo desta primeira etapa é simples: ajudar sua organização a testar uma forma mais clara de acompanhar contribuições, comprovantes e pendências, sem aumentar a complexidade da rotina.
```

Aplicar etiquetas:

```txt
ced_cliente_fundador_interesse
ced_acesso_enviado
ced_atendimento_iniciado
```

---

# Fluxo 3 — CED - Suporte de acesso

## Quando usar

Use quando o contato disser:

```txt
Não recebi o e-mail
Não consegui acessar
Esqueci minha senha
Não achei a senha
```

## Mensagem inicial

```txt
Vamos resolver seu acesso.

O Corrente em Dia foi pensado para começar simples, então não precisa se preocupar. Primeiro localizamos seu cadastro, depois confirmamos o melhor caminho para você entrar no painel.
```

## Pergunta

Se o contato veio do botão do site, não pergunte e-mail novamente. Se ele veio por outro caminho, pergunte:

```txt
Qual e-mail foi usado no cadastro?
```

Salvar em:

```txt
ced_email
```

## Encaminhamento

Se não houver integração de consulta pronta, aplicar:

```txt
ced_precisa_humano
```

Responder:

```txt
Obrigado. Vou direcionar para conferência manual da Automação Extrema.

Enquanto isso, confira se o e-mail não caiu em spam/lixo eletrônico e se foi digitado corretamente no cadastro.
```

---

# Webhook ou Bloco de Integração?

## Use Bloco de Integração quando:

- o BotConversa precisa enviar dados para a AE durante a conversa;
- o lead veio direto pelo WhatsApp;
- você quer criar o lead automaticamente no sistema;
- você quer receber uma resposta da AE e continuar o fluxo.

## Use Webhook passivo quando:

- outro sistema for chamar o BotConversa;
- a AE for iniciar uma automação dentro do BotConversa;
- você tiver uma integração externa acionando uma automação já existente.

## Estratégia recomendada agora

Para a V1:

- formulário do site cria o lead;
- página Obrigado abre WhatsApp pré-preenchido;
- BotConversa responde por palavra-chave;
- Bloco de Integração fica reservado para leads que chegam direto pelo WhatsApp.

---

# Mensagens persuasivas prontas

## Boas-vindas curta

```txt
Olá! Que bom receber seu interesse no Corrente em Dia.

A ideia não é colocar mais uma ferramenta na rotina da sua organização. É ajudar a tirar contribuições, comprovantes e pendências dos controles soltos, trazendo mais clareza, previsibilidade e tranquilidade para quem cuida da casa.
```

## Cliente Fundador

```txt
Como Cliente Fundador, sua organização participa da fase inicial com condições especiais, acompanhamento mais próximo e prioridade nas melhorias que realmente fazem diferença para a rotina da casa.
```

## Lead morno

```txt
Olá! Passando para confirmar se você conseguiu ver as orientações do Corrente em Dia.

A primeira etapa é simples: acessar o painel, completar os dados da organização e iniciar a avaliação. A proposta é reduzir retrabalho e dar mais clareza para contribuições, comprovantes e pendências.

Quer que eu te ajude a dar o próximo passo?
```

## Lead esfriando

```txt
Olá! Imagino que a rotina esteja corrida.

Só não queria deixar esfriar a oportunidade de participar como Cliente Fundador do Corrente em Dia. Nesta fase, sua organização pode testar a solução com acompanhamento mais próximo e ajudar a moldar melhorias reais.

Quer seguir com a avaliação ou prefere que eu retome em outro momento?
```

---

# Aviso interno para Márcio

## Opção mais simples na V1

Usar e-mail interno já enviado pelo sistema para `EMAIL_COPY_TO`.

## Opção pelo BotConversa

Se o BotConversa permitir envio interno para seu número, criar um bloco/ação com:

```txt
Novo lead Corrente em Dia pelo WhatsApp.

Nome: {{ced_nome_contato}}
WhatsApp: {{ced_whatsapp}}
E-mail: {{ced_email}}
Origem: {{ced_origem}}

Ação: acompanhar acesso e início da avaliação.
```

Número interno:

```txt
19 99236-0856
```

---

# Checklist final no BotConversa

- [ ] Criar campos personalizados.
- [ ] Criar etiquetas.
- [ ] Criar palavras-chave.
- [ ] Criar fluxo `CED - Lead vindo do site`.
- [ ] Criar fluxo `CED - Interesse direto pelo WhatsApp`.
- [ ] Criar fluxo `CED - Suporte de acesso`.
- [ ] Configurar Bloco de Integração no fluxo direto pelo WhatsApp.
- [ ] Testar mensagem vinda da página Obrigado.
- [ ] Testar lead direto pelo WhatsApp.
- [ ] Testar aviso interno/e-mail interno.
- [ ] Ajustar atendimento humano quando aplicar a etiqueta `ced_precisa_humano`.
