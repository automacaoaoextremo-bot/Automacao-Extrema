# Notas de implementação — Ajustes 05

## Alterados

- `rmc-landing.tsx`: ajustes de conteúdo e botão Fechar no topo direito do modal.
- `request-form.tsx`: endereços salvos do cliente; estado de autoatendimento desabilitado tratado antes de abrir formulário.
- `request-queue.tsx`: paginação e troca entre Lista/Detalhes no mobile.
- `/rmc/solicitar/page.tsx`: login completo mostrado no mesmo endereço enquanto anônimo, formulário exibido depois do acesso.
- `/rmc/entrar/page.tsx`: compartilha o mesmo componente visual de login.
- `/rmc/cadastro/page.tsx`: gateway operador/público.
- `api/atendimento-inteligente/actor`: informa se envio direto do cliente está habilitado.

## Novos

- `rmc-login-form.tsx`
- `rmc-registration-gate.tsx`
- `rmc-public-registration.tsx` (autocadastro desligado por padrão)
- `/rmc/esqueci-senha/page.tsx`
- `/rmc/redefinir-senha/page.tsx`
- `/api/atendimento-inteligente/my/addresses/route.ts`
- `/api/atendimento-inteligente/customers/self-register/route.ts` (desligado por padrão)

## Não alterados

- Integração BotConversa do TUCXA.
- Módulos StudyAgent e Organização em Harmonia.
- Regras e tokens de envio da Meta Cloud API.
- Tabelas ou migrations do Supabase; Ajustes 05 não precisam de SQL novo.
- `user-menu.tsx`: já renderiza nome e Sair com sessão autenticada.
