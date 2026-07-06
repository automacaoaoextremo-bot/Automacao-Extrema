# Passo a passo — Ajustes 2 do Bazar no Controle

## 1. Arquivos atualizados

Copie os arquivos deste pacote para a raiz do projeto `automacao-extrema`, preservando a estrutura de pastas.

Arquivos principais alterados:

- `src/components/bazar-sementinha/bazar-header.tsx`
- `src/app/bazar-sementinha/page.tsx`
- `src/app/bazar-sementinha/pedidos/pedidos-client.tsx`
- `src/app/bazar-sementinha/gestao/gestao-client.tsx`
- `src/app/api/bazar-sementinha/orders/route.ts`
- `src/app/api/bazar-sementinha/config/route.ts`
- `src/app/api/bazar-sementinha/bootstrap/route.ts`
- `src/app/api/bazar-sementinha/payments/route.ts`
- `vercel.json`
- `.yarnrc`

## 2. O que mudou

### Página inicial

- Removido o texto: `A primeira versão do Bazar no Controle foi pensada para o Sementinha do Tucxa`.
- Mantido o texto mais direto sobre registrar pedidos, cobrar no caixa e gerar prestação de contas.
- Removidos os CTAs repetidos `Abrir Pedidos` e `Abrir Caixa`, pois os links já estão no menu superior.

### Cabeçalho

- Incluído o link `Início` na terceira linha do cabeçalho.
- O menu agora fica em uma linha rolável no mobile, evitando quebra visual.

### Pedidos

- Criada separação entre `BAZAR` e `CARDÁPIO` no início da página.
- Ao alternar entre Bazar e Cardápio, o carrinho mantém apenas itens do tipo selecionado, reduzindo risco de misturar bazar com alimentação.
- A área de Cardápio foi aproximada do comportamento visual usado na Festa Junina do Tucxa:
  - busca no topo;
  - filtros `Todos`, `Salgados`, `Bebidas`, `Doces`;
  - cards com botão `+`, `-` e quantidade.
- Mantida prevenção de duplicidade:
  - botão desabilitado após o clique;
  - texto `Registrando...`;
  - `attemptId` no formulário;
  - reaproveitamento de pedido idêntico do mesmo cliente nos últimos 15 segundos.

### Gestão

- Removida a mensagem indevida de `Acesso não autorizado` no carregamento inicial dos cadastros.
- Incluído menu lateral com:
  - `Valores do Bazar`;
  - `Categorias`;
  - `Cardápio`;
  - `Pedidos`.
- Os cadastros agora usam `credentials: same-origin` nas chamadas protegidas.
- Incluída tela de pedidos na gestão com ações:
  - `Editar`;
  - `Cancelar/Reabrir`;
  - `Excluir`.

### API de pedidos

- Adicionado `GET /api/bazar-sementinha/orders` para listar pedidos na gestão.
- Adicionado `PATCH /api/bazar-sementinha/orders` para editar/cancelar/reabrir pedido.
- Adicionado `DELETE /api/bazar-sementinha/orders?id=...` para marcar pedido como `excluido` sem apagar fisicamente do banco.
- Melhorado log de erro no servidor para facilitar diagnóstico em caso de erro 500.
- Trocado `crypto.randomUUID()` por `randomUUID` importado de `crypto`, deixando o runtime mais previsível na Vercel.

## 3. Comandos locais

Após copiar os arquivos, rode:

```bash
npm run lint
npx --no-install tsc --noEmit
npm run build
```

Se o ambiente local ainda estiver usando Yarn para simular Vercel, também pode testar:

```bash
yarn install --no-lockfile --network-timeout 600000 --ignore-engines
yarn build
```

## 4. Commit e deploy

```bash
git add .
git commit -m "Ajusta home pedidos gestao e acoes do Bazar no Controle"
git push
```

Na Vercel, faça um novo deploy. Se tiver alteração de dependências ou erro anterior de instalação, faça `Redeploy` com `Clear build cache`.

## 5. Testes recomendados

1. Acessar `/bazar-sementinha` e confirmar que:
   - não aparece mais o texto removido;
   - não aparecem mais os CTAs duplicados;
   - o menu tem `Início`, `Pedidos`, `Caixa` e `Prestação`.

2. Acessar `/bazar-sementinha/pedidos` e confirmar que:
   - existe alternância `BAZAR | CARDÁPIO`;
   - o cardápio mostra busca e filtros `Todos`, `Salgados`, `Bebidas`, `Doces`;
   - criar pedido do bazar funciona;
   - criar pedido do cardápio funciona;
   - clique duplo reaproveita o pedido.

3. Acessar `/bazar-sementinha/login`, entrar com `bazardosementinha@gmail.com` e a senha configurada, e confirmar que:
   - a gestão carrega sem `Acesso não autorizado`;
   - é possível incluir/editar/inativar/excluir valores, categorias e itens do cardápio;
   - a aba `Pedidos` mostra os pedidos com ações de editar, cancelar/reabrir e excluir.

4. Acessar `/bazar-sementinha/caixa` e confirmar que:
   - pedidos excluídos não aparecem para pagamento;
   - pedidos cancelados não aparecem como pendentes;
   - pagamentos Pix, crédito, débito e dinheiro continuam funcionando.
