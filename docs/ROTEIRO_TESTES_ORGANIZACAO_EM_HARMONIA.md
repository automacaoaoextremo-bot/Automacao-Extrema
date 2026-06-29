# Roteiro de testes — Organização em Harmonia / Agenda Viva Tucxa

## Teste 1 — Quero Conhecer mínimo

1. Acessar `/solucoes/organizacao-em-harmonia/quero-conhecer`.
2. Confirmar que aparecem somente campos obrigatórios:
   - Nome do contato
   - WhatsApp
   - E-mail
3. Confirmar que não aparecem:
   - Solução de interesse
   - Nome da organização
4. Enviar sem marcar LGPD/Cliente Fundador e confirmar que não bloqueia.
5. Verificar redirecionamento para Obrigado.
6. Verificar e-mail enviado.
7. Clicar em Continuar pelo WhatsApp.

## Teste 2 — Interesse vindo do módulo Agenda Viva

1. Acessar `/solucoes/organizacao-em-harmonia/quero-conhecer?modulo=agenda-viva`.
2. Confirmar que o formulário continua mínimo.
3. Confirmar que a mensagem registra Agenda Viva como interesse, sem exigir seleção manual.

## Teste 3 — Supabase

Verificar se o lead foi criado em `oh_leads` com:

```txt
priority_module = agenda-viva
implantation_due_at preenchido
founder_evaluation_days = 30
next_reminder_at preenchido
enabled_modules_requested preenchido
```

## Teste 4 — Área logada

1. Acessar `/solucoes/organizacao-em-harmonia/cliente`.
2. No desktop, confirmar menu lateral.
3. No celular, confirmar menu em pílulas no cabeçalho.
4. Acessar `/cliente/agenda-viva`.
5. Confirmar tipos de atividades do Tucxa e regras iniciais.

## Teste 5 — BotConversa

1. Confirmar fluxo `OH - Lead vindo do site`.
2. Palavra-chave com condição Contém.
3. Confirmar envio da mensagem `{oh_resp_botconversa}` ou mensagem fixa de segurança.
4. Testar palavra AJUDA.

## Teste 6 — Lembretes

1. Ajustar um lead de teste com `next_reminder_at` no passado e `last_reminder_sent_at` nulo.
2. Chamar `/api/cron/organizacao-em-harmonia-reminders?token=SEU_TOKEN`.
3. Confirmar e-mail para AE e contato.
4. Confirmar `last_reminder_sent_at` preenchido.
