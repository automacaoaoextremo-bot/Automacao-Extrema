# Passo a passo — correção do lookup por telefone no BotConversa

## Objetivo

Corrigir a integração entre BotConversa e Automação Extrema para que o endpoint:

```text
/api/corrente-em-dia/leads/lookup
```

consiga localizar o lead mesmo quando o telefone vier em formatos diferentes, como:

```text
19992360856
5519992360856
+55 19 99236-0856
(19) 99236-0856
```

E, quando não localizar, a resposta deve continuar útil, sem pedir para o lead preencher novamente o formulário **Quero Conhecer**.

---

## Arquivo alterado

Substitua o arquivo:

```text
src/app/api/corrente-em-dia/leads/lookup/route.ts
```

pela versão atualizada enviada junto com este passo a passo.

---

## O que foi alterado no endpoint

### 1. Lookup flexível por telefone

A API agora compara o telefone recebido com variações:

- número exatamente como recebido;
- número sem código do Brasil `55`;
- número com código do Brasil `55`;
- últimos 11 dígitos;
- comparação normalizada em JavaScript para cobrir telefones salvos com máscara.

### 2. Ordem de busca

A busca segue esta ordem:

```text
1. leadId
2. email
3. WhatsApp flexível
4. fallback amigável
```

### 3. Fallback sem pedir novo cadastro

Quando o lead não é localizado, o BotConversa recebe uma mensagem orientando:

- acessar a URL de login;
- usar o e-mail informado no cadastro;
- conferir spam/lixo eletrônico;
- usar “Esqueci minha senha” se necessário;
- responder AJUDA se precisar de suporte.

Não aparece mais orientação para preencher novamente o **Quero Conhecer**.

---

## Configuração no BotConversa

### Método

```text
POST
```

### URL

```text
https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup
```

### Header

Nome:

```text
Content-Type
```

Valor:

```text
application/json
```

Não use dois-pontos no nome do header.

### Body do fluxo real

```json
{
  "source": "botconversa_ced_site",
  "whatsapp": "{telefone}"
}
```

Use o seletor de variáveis do BotConversa para inserir `{telefone}`.

---

## Mapeamento de resposta

Mapeie:

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

Depois, no bloco de conteúdo seguinte, envie somente:

```text
{ced_resp_botconversa}
```

Use o seletor de variáveis para inserir o campo `ced_resp_botconversa`.

---

## Saídas do Bloco de Integração

Conecte apenas:

```text
Em resposta com sucesso -> Conteúdo com {ced_resp_botconversa}
```

Deixe desconectada:

```text
Continuar sem esperar resposta
```

Se as duas saídas ficarem conectadas, o lead pode receber mensagens duplicadas.

---

## Testes após publicar

### 1. Teste GET no navegador

Acesse:

```text
https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup
```

Deve retornar um JSON com instruções do endpoint.

### 2. Teste via PowerShell com telefone sem 55

```powershell
$body = @{
  source = "botconversa_teste"
  whatsapp = "19992360856"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

### 3. Teste via PowerShell com telefone com 55

```powershell
$body = @{
  source = "botconversa_teste"
  whatsapp = "5519992360856"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Se o lead existir, os dois testes devem localizar o mesmo cadastro.

### 4. Teste no BotConversa com número fixo

Temporariamente, no body do Bloco de Integração:

```json
{
  "source": "botconversa_teste",
  "whatsapp": "19992360856"
}
```

Clique em **Testar Requisição**.

### 5. Teste no BotConversa com variável

Depois volte para:

```json
{
  "source": "botconversa_ced_site",
  "whatsapp": "{telefone}"
}
```

Teste pelo fluxo real.

---

## Mensagem quando localizar

A AE devolve no campo `botconversaMessage` uma mensagem pronta com:

- confirmação de localização;
- link de login;
- e-mail usado no cadastro;
- orientação para conferir spam/lixo eletrônico;
- orientação para usar “Esqueci minha senha” se necessário;
- próximos passos.

---

## Mensagem quando não localizar

A AE devolve no campo `botconversaMessage` uma mensagem amigável com:

- informação de que o cadastro não foi localizado automaticamente;
- link de login;
- orientação para usar o e-mail informado no cadastro;
- orientação para conferir spam/lixo eletrônico;
- orientação para usar “Esqueci minha senha”;
- orientação para responder AJUDA.

---

## GitHub e Vercel

Depois de substituir os arquivos:

```powershell
npm run lint
npm run build

git status
git add .
git commit -m "Corrige lookup flexivel do BotConversa Corrente em Dia"
git push origin main
```

Se sua branch principal for `master`:

```powershell
git push origin master
```

Após o deploy da Vercel, repita os testes no endpoint de produção e depois no BotConversa.
