# Corrente em Dia — estratégia mínima de captura + BotConversa

## 1. Estratégia atual

A página **Quero Conhecer** passa a pedir somente:

1. Nome do contato
2. WhatsApp
3. E-mail

Esses três campos são obrigatórios. Os demais dados da organização devem ser preenchidos depois, dentro da área logada do cliente.

Objetivo: reduzir fricção, criar o acesso rapidamente e levar o lead para uma conversa no WhatsApp da AE, onde o BotConversa pode continuar o atendimento.

## 2. O que acontece no site

1. Lead preenche nome, WhatsApp e e-mail.
2. Sistema cria lead no funil do Corrente em Dia.
3. Sistema cria cliente/organização provisória em configuração.
4. Sistema cria pessoa responsável.
5. Sistema cria usuário inicial no Supabase Auth, quando possível.
6. Sistema envia e-mail com acesso.
7. Sistema redireciona para `/solucoes/corrente-em-dia/obrigado`.
8. Página de obrigado orienta o lead a clicar no botão **Abrir WhatsApp da AE**.

## 3. Campos personalizados no BotConversa

Crie estes campos:

- `ced_nome_contato`
- `ced_whatsapp`
- `ced_email`
- `ced_lead_id`
- `ced_origem`
- `ced_status`
- `ced_status_label`
- `ced_login_url`
- `ced_access_email`
- `ced_organizacao`
- `ced_ultimo_retorno_api`

## 4. Etiquetas recomendadas

Crie estas etiquetas:

- `ced_lead_site`
- `ced_cliente_fundador`
- `ced_acesso_enviado`
- `ced_aguardando_primeiro_acesso`
- `ced_precisa_suporte`
- `ced_configuracao_pendente`
- `ced_lgpd_pendente`
- `ced_termo_fundador_pendente`
- `ced_morno`
- `ced_esfriando`

## 5. Palavra-chave principal

Em **Automação > Palavras Chave**, crie:

- Corrente em Dia
- Vim pelo Corrente em Dia
- Quero receber meu acesso
- Cliente Fundador
- Quero ajuda com meu acesso

Ação: iniciar o fluxo **CED - Atendimento vindo do site**.

## 6. Fluxo 1 — CED - Atendimento vindo do site

### Bloco 1 — Mensagem de boas-vindas

Texto:

> Olá! Que bom ter você por aqui.
>
> Vi que você veio pelo Corrente em Dia. A ideia agora é simples: localizar seu cadastro e te orientar para acessar o painel, completar os dados da organização e começar a avaliação como Cliente Fundador.
>
> Assim sua casa começa a sair dos comprovantes espalhados, mensagens soltas e controles manuais, ganhando mais clareza e tranquilidade para acompanhar as contribuições.

### Bloco 2 — Perguntar e-mail

Texto:

> Para localizar seu cadastro, informe o e-mail usado no formulário Quero Conhecer.

Salvar em: `ced_email`.

### Bloco 3 — Bloco de Integração

Use **Bloco de Integração**.

Método: `POST`

URL de produção:

```txt
https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup
```

Body JSON:

```json
{
  "email": "{{ced_email}}",
  "source": "botconversa_atendimento_site"
}
```

Headers:

```txt
Content-Type: application/json
```

Mapeie o retorno, se o BotConversa permitir:

- `leadId` -> `ced_lead_id`
- `statusLabel` -> `ced_status_label`
- `loginUrl` -> `ced_login_url`
- `accessEmail` -> `ced_access_email`
- `organizationName` -> `ced_organizacao`

### Bloco 4A — Se encontrou cadastro

Texto:

> Localizei seu cadastro do Corrente em Dia.
>
> O acesso foi enviado para o e-mail informado. Confira também spam/lixo eletrônico.
>
> Link de acesso: {{ced_login_url}}
>
> Próximo passo: entrar no painel e completar os dados da organização para iniciar a avaliação de 30 dias como Cliente Fundador.

Aplicar etiquetas:

- `ced_lead_site`
- `ced_cliente_fundador`
- `ced_acesso_enviado`

### Bloco 4B — Se não encontrou cadastro

Texto:

> Não localizei esse e-mail no cadastro do Corrente em Dia.
>
> Você pode preencher novamente pelo link:
> https://www.automacaoextrema.com/solucoes/corrente-em-dia/quero-conhecer
>
> Se preferir, envie aqui o nome do contato e o WhatsApp para verificarmos manualmente.

Aplicar etiqueta:

- `ced_precisa_suporte`

## 7. Aviso para Márcio no WhatsApp particular

Opção recomendada no início:

1. No BotConversa, crie um contato seu com o WhatsApp `19992360856`.
2. Se a sua versão permitir enviar mensagem/iniciar fluxo para outro contato, crie um bloco após a localização do cadastro para enviar:

```txt
Novo lead Corrente em Dia veio do site/e-mail.

E-mail informado: {{ced_email}}
Status: {{ced_status_label}}
Login: {{ced_login_url}}
Ação: acompanhar se acessou e completou a configuração.
```

3. Se a sua versão não permitir enviar mensagem para outro contato dentro do fluxo, use o e-mail interno da AE e o funil `/admin/ae/corrente-em-dia/funil` como controle principal.

## 8. Fluxo 2 — CED - Quero conhecer direto pelo WhatsApp

Use quando a pessoa não veio pelo formulário do site e manda mensagem direto no WhatsApp.

Campos que o fluxo deve pedir:

1. Nome do contato -> `ced_nome_contato`
2. WhatsApp -> geralmente já é o número do contato; salvar também em `ced_whatsapp`
3. E-mail -> `ced_email`

Depois use Bloco de Integração:

URL:

```txt
https://www.automacaoextrema.com/api/corrente-em-dia/leads
```

Body:

```json
{
  "source": "botconversa_whatsapp_minimo",
  "contactName": "{{ced_nome_contato}}",
  "responsibleName": "{{ced_nome_contato}}",
  "whatsapp": "{{ced_whatsapp}}",
  "email": "{{ced_email}}",
  "founderTermsAccepted": false,
  "testimonialPermission": false,
  "lgpdContactConsent": false,
  "observations": "Cadastro mínimo feito pelo BotConversa. Dados completos serão preenchidos na área logada."
}
```

Mensagem de retorno:

> Perfeito, {{ced_nome_contato}}. Seu interesse no Corrente em Dia foi registrado.
>
> Enviamos as orientações de acesso para {{ced_email}}.
>
> A proposta é começar simples: entrar no painel, completar os dados da organização e avaliar por 30 dias como Cliente Fundador.
>
> Isso ajuda sua organização a ganhar clareza nas contribuições, reduzir comprovantes soltos e aliviar o retrabalho de quem cuida da casa.

## 9. Fluxo 3 — Lead morno

Use após 24h a 48h sem completar a configuração.

> Olá, {{ced_nome_contato}}. Passando para confirmar se você conseguiu acessar o Corrente em Dia.
>
> A primeira configuração é rápida e ajuda a mostrar onde a organização pode ganhar clareza nas contribuições, comprovantes e pendências.
>
> Quer que eu te ajude a dar o primeiro passo agora?

Etiqueta: `ced_morno`.

## 10. Fluxo 4 — Lead esfriando

Use após 3 a 5 dias sem evolução.

> Olá, {{ced_nome_contato}}. Sei que a rotina da casa pode ser corrida.
>
> Só não queria deixar essa oportunidade esfriar, porque a fase de Cliente Fundador é justamente para organizações que querem testar com acompanhamento mais próximo e prioridade nas melhorias.
>
> O ganho principal não é “ter mais um sistema”. É reduzir esquecimento, retrabalho e insegurança na hora de acompanhar contribuições e comprovantes.
>
> Quer manter sua organização na avaliação ou prefere que eu retome em outro momento?

Etiqueta: `ced_esfriando`.

## 11. Observações importantes

- O site envia o e-mail de acesso automaticamente.
- O WhatsApp passa a ser o canal de continuidade e suporte.
- Se for necessário enviar mensagem ativa fora da janela de 24h, usar modelos/templates aprovados da API Oficial do WhatsApp.
- LGPD, Cliente Fundador, dados completos da organização, valores e taxas devem ser confirmados na área logada.
