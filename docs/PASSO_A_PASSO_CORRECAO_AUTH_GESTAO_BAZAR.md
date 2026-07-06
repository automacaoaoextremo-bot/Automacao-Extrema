# Correção de autenticação da gestão do Bazar no Controle

## Objetivo
Corrigir as falhas de autorização nas ações da área de Gestão do Bazar no Controle, principalmente:

- mensagem indevida de `Acesso não autorizado`;
- erro 500 ao inativar/editar/excluir cadastros;
- erro 500 ao cancelar/editar/excluir pedidos.

## Arquivos alterados

- `src/lib/bazar-sementinha.ts`
- `src/app/api/bazar-sementinha/auth/route.ts`
- `src/app/bazar-sementinha/login/login-client.tsx`
- `src/app/bazar-sementinha/gestao/gestao-client.tsx`
- `src/app/api/bazar-sementinha/config/route.ts`
- `src/app/api/bazar-sementinha/orders/route.ts`

## O que mudou

1. O login agora retorna também um `sessionToken` assinado.
2. A tela de login salva esse token no `localStorage` do navegador.
3. A tela de gestão envia esse token no header `x-bazar-session` em todas as chamadas protegidas.
4. As APIs protegidas agora validam tanto:
   - cookie `bazar_sementinha_session`; quanto
   - header `x-bazar-session`; ou
   - header `Authorization: Bearer ...`.
5. Erros de sessão inválida agora retornam HTTP 401, e não 500.

## Passo a passo para atualizar

1. Extraia o zip na raiz do projeto `automacao-extrema`, substituindo os arquivos existentes.

2. Rode localmente:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

3. Faça commit:

```powershell
git add src/lib/bazar-sementinha.ts src/app/api/bazar-sementinha/auth/route.ts src/app/bazar-sementinha/login/login-client.tsx src/app/bazar-sementinha/gestao/gestao-client.tsx src/app/api/bazar-sementinha/config/route.ts src/app/api/bazar-sementinha/orders/route.ts docs/PASSO_A_PASSO_CORRECAO_AUTH_GESTAO_BAZAR.md
git commit -m "Corrige autenticação da gestão do Bazar no Controle"
git push
```

4. Depois do deploy, faça logout e login novamente em:

```text
/bazar-sementinha/login
```

5. Teste na gestão:

- inativar valor;
- editar valor;
- excluir valor;
- cancelar pedido;
- excluir pedido.

## Observação importante

Como agora existe também autenticação por header assinado, é importante fazer login novamente após publicar a correção, para que o navegador receba e salve o novo token em `localStorage`.
