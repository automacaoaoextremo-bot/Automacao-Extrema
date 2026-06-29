# Passo a passo BotConversa — Organização em Harmonia

## 1. Estratégia

Usar um único fluxo para a suíte:

```txt
OH - Lead vindo do site
```

Esse fluxo atende leads vindos da página principal e das páginas dos módulos:

- Organização em Harmonia
- Corrente em Dia
- Atendimento em Harmonia
- Agenda Viva

O formulário é único e envia no texto do WhatsApp qual foi o interesse escolhido.

## 2. Campos personalizados recomendados

Crie ou confira estes campos:

```txt
oh_nome_contato
oh_email
oh_whatsapp
oh_lead_id
oh_modulo
oh_modulo_slug
oh_organizacao
oh_origem
oh_status
oh_login_url
oh_interesse_cliente_fundador
oh_email_enviado
oh_resp_botconversa
```

Quando for integrar via API, usar os IDs reais dos campos no `.env.local` e na Vercel.

## 3. Etiquetas recomendadas

```txt
oh_lead_site
oh_email_confirmacao_enviado
oh_cliente_fundador_interesse
oh_aguardando_validacao
oh_whatsapp_iniciado
oh_precisa_humano
oh_ajuda_solicitada
```

## 4. Palavra-chave

Criar uma palavra-chave com condição **Contém**.

Frases:

```txt
Organização em Harmonia
Corrente em Dia
Atendimento em Harmonia
Agenda Viva
Cliente Fundador
Quero conhecer
Preenchi o Quero Conhecer
Código do lead
```

## 5. Fluxo recomendado agora

Enquanto a atualização via API do campo `oh_resp_botconversa` ainda estiver em validação, usar mensagem fixa segura:

```txt
Olá, {primeiro-nome}! Recebi seu cadastro da Organização em Harmonia.

Seu interesse já está salvo e também enviamos uma confirmação para o e-mail informado no formulário. Se não encontrar, confira spam/lixo eletrônico.

A proposta é começar pelas dores reais da organização: pessoas, funções, permissões, agenda, atendimentos e contribuições em uma base mais clara, sem obrigar a rotina a mudar sua essência.

Próximo passo:
vamos entender qual módulo faz mais sentido primeiro, quais regras precisam ser configuradas e quem poderá aprovar, editar ou acompanhar cada informação.

Se tiver qualquer dificuldade, responda AJUDA por aqui.
```

Ações após a mensagem:

```txt
Adicionar etiqueta: oh_lead_site
Adicionar etiqueta: oh_whatsapp_iniciado
Definir oh_status = whatsapp_iniciado
Notificar equipe/Márcio
```

## 6. Fluxo depois da API validada

Quando o campo `oh_resp_botconversa` estiver sendo preenchido corretamente pela API da AE, o fluxo pode ter só o bloco:

```txt
{oh_resp_botconversa}
```

A mensagem gravada pela AE deve conter:

- nome do contato;
- e-mail;
- WhatsApp;
- código do lead;
- solução de interesse;
- orientação para procurar o e-mail no spam/lixo eletrônico;
- próximos passos;
- orientação para responder AJUDA.

## 7. Fluxo AJUDA

Criar palavra-chave separada:

```txt
AJUDA
```

Mensagem:

```txt
Claro. Vou te ajudar.

Escolha a etapa:

1 - Não encontrei o e-mail de confirmação
2 - Quero entender a Organização em Harmonia completa
3 - Quero falar sobre Corrente em Dia
4 - Quero falar sobre Atendimento em Harmonia
5 - Quero falar sobre Agenda Viva
6 - Quero falar com a equipe
```

Aplicar etiqueta:

```txt
oh_ajuda_solicitada
oh_precisa_humano
```

## 8. Observações importantes

- Não pedir novamente todos os dados do formulário no WhatsApp.
- Não enviar senha por WhatsApp.
- Sempre orientar a procurar e-mail também em spam/lixo eletrônico.
- Se o campo `oh_resp_botconversa` estiver vazio, usar mensagem fixa para não deixar o lead sem resposta.
- O WhatsApp deve ser continuação do cadastro, não uma nova barreira.
