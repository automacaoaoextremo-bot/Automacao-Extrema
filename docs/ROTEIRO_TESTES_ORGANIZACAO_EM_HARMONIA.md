# Roteiro de testes — Organização em Harmonia

## 1. Páginas públicas

Testar:

```txt
/solucoes/organizacao-em-harmonia
/solucoes/atendimento-em-harmonia
/solucoes/agenda-viva
```

Validar:

- cabeçalho igual ao padrão Corrente em Dia;
- menu mobile em pílulas no cabeçalho;
- página pública sem texto “Oceano Azul”;
- seção Benefícios em cards;
- Cliente Fundador no padrão visual do Corrente em Dia;
- módulos com link para Quero Conhecer pré-selecionado;
- módulos citando Organização em Harmonia como solução completa.

## 2. Quero Conhecer único

Testar:

```txt
/solucoes/organizacao-em-harmonia/quero-conhecer
/solucoes/organizacao-em-harmonia/quero-conhecer?modulo=corrente-em-dia
/solucoes/organizacao-em-harmonia/quero-conhecer?modulo=atendimento-em-harmonia
/solucoes/organizacao-em-harmonia/quero-conhecer?modulo=agenda-viva
```

Validar:

- solução de interesse vem preenchida corretamente;
- opções não duplicam “Pacote Completo” e “Organização em Harmonia”;
- nome, WhatsApp e e-mail são obrigatórios;
- LGPD e Cliente Fundador não barram o envio;
- formulário redireciona para a página Obrigado;
- e-mail de confirmação é enviado;
- botão WhatsApp leva mensagem pré-preenchida para a AE.

## 3. Área logada

Testar:

```txt
/solucoes/organizacao-em-harmonia/cliente
/solucoes/organizacao-em-harmonia/cliente/base-unica
/solucoes/organizacao-em-harmonia/cliente/modulos
/solucoes/organizacao-em-harmonia/cliente/configuracoes
/solucoes/organizacao-em-harmonia/cliente/relatorios
```

Desktop:

- menu lateral aparece;
- menu superior permanece para navegação rápida;
- conteúdo fica à direita.

Mobile:

- menu lateral não aparece;
- pílulas ficam no cabeçalho;
- conteúdo fica em uma coluna.

## 4. BotConversa

- Preencher Quero Conhecer.
- Clicar em Continuar pelo WhatsApp.
- Confirmar que o fluxo OH - Lead vindo do site inicia.
- Confirmar mensagem fixa segura ou `{oh_resp_botconversa}`.
- Confirmar orientação para procurar e-mail em spam/lixo eletrônico.

## 5. Git/Vercel

- Rodar `npm run lint`.
- Rodar `npm run build`.
- Fazer push na branch `feature/organizacao-em-harmonia`.
- Validar deploy preview.
