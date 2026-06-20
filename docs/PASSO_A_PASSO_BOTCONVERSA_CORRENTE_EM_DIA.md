# Corrente em Dia — BotConversa, Webhook e Funil Cliente Fundador

## Objetivo

Capturar interesse pelo WhatsApp da Automação Extrema, cadastrar automaticamente o lead do Corrente em Dia, criar a organização inicial, criar o responsável, preparar acesso ao sistema, enviar e-mail de boas-vindas/acesso e refletir tudo no funil da Gestão AE.

## URL do webhook da Automação Extrema

Produção:

```txt
https://www.automacaoextrema.com/api/corrente-em-dia/leads
```

Local:

```txt
http://localhost:3000/api/corrente-em-dia/leads
```

## Variáveis recomendadas no BotConversa

Crie campos/variáveis para o contato:

```txt
ced_tipo_entidade
ced_nome_organizacao
ced_responsavel_nome
ced_uf
ced_cidade
ced_whatsapp
ced_email
ced_estimativa_contribuintes
ced_observacoes
ced_aceite_cliente_fundador
ced_aceite_lgpd
```

## Fluxo recomendado no BotConversa

Nome do fluxo:

```txt
CED - Interesse Cliente Fundador
```

Palavras-chave para ativar:

```txt
Corrente em Dia
Cliente Fundador
Quero conhecer Corrente em Dia
Contribuições da casa
```

### Bloco 1 — Saudação

Mensagem:

```txt
Olá! Gratidão pelo interesse no Corrente em Dia.

Vou coletar alguns dados rápidos para preparar o cadastro inicial da sua organização como Cliente Fundador.
```

### Bloco 2 — Tipo de organização

Pergunta:

```txt
Qual é o tipo da organização?

1 - Terreiro
2 - Associação
3 - Federação
```

Salvar em: `ced_tipo_entidade`.

### Bloco 3 — Nome da organização

Pergunta:

```txt
Qual é o nome da organização?
```

Salvar em: `ced_nome_organizacao`.

### Bloco 4 — Nome do responsável

Pergunta:

```txt
Qual é o nome completo da pessoa responsável por iniciar a avaliação?
```

Salvar em: `ced_responsavel_nome`.

### Bloco 5 — UF

Pergunta:

```txt
Qual é a UF da organização? Ex.: SP, RJ, MG, BA...
```

Salvar em: `ced_uf`.

### Bloco 6 — Cidade

Pergunta:

```txt
Qual é a cidade da organização?
```

Salvar em: `ced_cidade`.

### Bloco 7 — WhatsApp

Pergunta:

```txt
Qual WhatsApp devemos usar para contato?
```

Salvar em: `ced_whatsapp`.

### Bloco 8 — E-mail

Pergunta:

```txt
Qual e-mail devemos usar para enviar o acesso inicial?
```

Salvar em: `ced_email`.

### Bloco 9 — Estimativa de contribuintes

Pergunta:

```txt
Aproximadamente quantas pessoas podem contribuir pela organização?
```

Salvar em: `ced_estimativa_contribuintes`.

### Bloco 10 — Observações

Pergunta:

```txt
Hoje, como vocês controlam contribuições, Pix e comprovantes?
```

Salvar em: `ced_observacoes`.

### Bloco 11 — Aceite LGPD e Cliente Fundador

Mensagem:

```txt
Para seguir, preciso confirmar dois pontos:

1. A Automação Extrema poderá usar estes dados para contato sobre o Corrente em Dia.
2. Como Cliente Fundador, sua organização participa da avaliação inicial por 30 dias e autoriza a AE a solicitar feedback e possível depoimento/testemunho, sempre mediante confirmação expressa.

Podemos seguir?

1 - Sim, concordo e quero seguir
2 - Quero falar com alguém antes
```

Se resposta for 1, grave:

```txt
ced_aceite_cliente_fundador = sim
ced_aceite_lgpd = sim
```

Se resposta for 2, direcione para atendimento humano.

## Bloco de integração — envio para a AE

Crie um bloco de integração no fluxo, após os aceites.

Método:

```txt
POST
```

URL:

```txt
https://www.automacaoextrema.com/api/corrente-em-dia/leads
```

Headers:

```txt
Content-Type: application/json
```

Body JSON:

```json
{
  "source": "botconversa_whatsapp_ae",
  "organizationType": "{{ced_tipo_entidade}}",
  "organizationName": "{{ced_nome_organizacao}}",
  "responsibleName": "{{ced_responsavel_nome}}",
  "state": "{{ced_uf}}",
  "city": "{{ced_cidade}}",
  "whatsapp": "{{ced_whatsapp}}",
  "email": "{{ced_email}}",
  "contributorsEstimate": "{{ced_estimativa_contribuintes}}",
  "observations": "{{ced_observacoes}}",
  "founderTermsAccepted": true,
  "testimonialPermission": true,
  "lgpdContactConsent": true
}
```

## Mensagem após integração bem-sucedida

```txt
Cadastro recebido. O Corrente em Dia já preparou o registro inicial da sua organização.

Enviamos para o e-mail informado as orientações de acesso ao painel para iniciar a configuração da avaliação como Cliente Fundador.

A proposta é começar simples: clareza nas contribuições, comprovantes organizados e menos retrabalho para quem cuida da casa.
```

## Mensagem se houver erro

```txt
Não consegui concluir o cadastro automaticamente agora.

Já registrei sua intenção de conhecer o Corrente em Dia e a Automação Extrema vai revisar manualmente.
```

## Aviso interno para o Márcio

O sistema envia e-mail interno para a AE com os dados do lead. Para aviso via WhatsApp, use uma destas opções:

1. Encaminhar a resposta do bloco de integração para atendimento humano e notificar manualmente.
2. Criar uma automação específica no BotConversa para avisar o contato do Márcio quando o fluxo for concluído.
3. Futuramente configurar envio ativo via API oficial/modelo de mensagem, se o plano/conta permitir.

Mensagem interna sugerida:

```txt
Novo lead Corrente em Dia - Cliente Fundador

Tipo: {{ced_tipo_entidade}}
Organização: {{ced_nome_organizacao}}
Responsável: {{ced_responsavel_nome}}
Cidade/UF: {{ced_cidade}}/{{ced_uf}}
WhatsApp: {{ced_whatsapp}}
E-mail: {{ced_email}}
Contribuintes estimados: {{ced_estimativa_contribuintes}}

Observações:
{{ced_observacoes}}
```

## Teste com os três leads

Use o próprio fluxo para cadastrar:

1. Terreiro Teste — Marcio Alexandre Silva — Campinas/SP — 100 contribuintes.
2. Associação Teste — Daniela Aparecida M da Silva — Campinas/SP — 150 contribuintes.
3. Federação Teste — Gabriel Mattano da Silva — Campinas/SP — 200 contribuintes.

Depois valide no funil:

```txt
/admin/ae/corrente-em-dia/funil
```

## Mudança de alerta após automação do acesso

Como o acesso passa a ser preparado automaticamente, o alerta de 12h deixa de ser “enviar acesso” e passa a ser:

```txt
Verificar se o e-mail foi enviado, se o lead conseguiu acessar e se a organização iniciou a configuração.
```

Se o SMTP estiver sem configuração, o funil sinaliza que o acesso precisa de revisão manual.
