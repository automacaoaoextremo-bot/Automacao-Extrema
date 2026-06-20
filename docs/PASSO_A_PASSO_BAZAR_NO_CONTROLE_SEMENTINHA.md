# Passo a passo — Bazar no Controle — Sementinha 04/07/2026

## 1. Copiar os arquivos

Substitua/adicione os arquivos deste pacote na raiz do projeto `automacao-extrema`.

## 2. Instalar dependências

Foi incluída a dependência `qrcode` para gerar QR Code Pix e Pix Copia e Cola.

```powershell
npm install
```

## 3. Configurar variáveis no `.env.local` e na Vercel

Mantenha as variáveis atuais do Supabase e inclua:

```env
BAZAR_SEMENTINHA_PASSWORD=Sementinha@2026
BAZAR_SEMENTINHA_AUTH_SECRET=troque-por-uma-chave-grande-aleatoria
```

A senha pode ser alterada depois. O acesso inicial da Gestão é:

- E-mail: `bazardosementinha@gmail.com`
- Senha: valor configurado em `BAZAR_SEMENTINHA_PASSWORD`

## 4. Rodar o SQL no Supabase

Abra o Supabase > SQL Editor e execute:

```txt
supabase/sql/20260620_bazar_no_controle_sementinha.sql
```

Este SQL cria as tabelas do Bazar no Controle, cadastra o evento `Bazar do Sementinha — 04/07/2026`, inclui os valores de R$ 5 a R$ 50, categorias iniciais e cardápio inicial.

## 5. Testar localmente

```powershell
npm run build
npm run dev
```

Rotas principais:

- `/bazar-sementinha`
- `/bazar-sementinha/pedidos`
- `/bazar-sementinha/caixa`
- `/bazar-sementinha/prestacao-contas`
- `/bazar-sementinha/login`
- `/bazar-sementinha/gestao`

## 6. Publicar na Vercel

Depois do teste local:

```powershell
git add .
git commit -m "Adiciona Bazar no Controle Sementinha"
git push
```

Confirme na Vercel se as variáveis foram cadastradas e faça o deploy.

## 7. Prevenção de duplicidade implementada

Na tela de pedidos:

- O botão `Criar pedido` fica desabilitado após o primeiro clique.
- O texto muda para `Registrando...`.
- Cada envio leva um `attemptId` único.

No servidor:

- Se o mesmo `attemptId` chegar novamente, o sistema reaproveita o pedido já criado.
- Se houver pedido idêntico do mesmo cliente, com mesmos itens e mesmo valor nos últimos 15 segundos, o sistema reaproveita o pedido existente.
- O cliente é único por evento usando o nome normalizado. Se já existe `Márcio`, outra pessoa deve ser cadastrada como `Márcio Alex`, por exemplo.

## 8. Fluxo recomendado no dia do evento

1. A equipe do quintal usa `/bazar-sementinha/pedidos` para registrar itens de bazar e alimentos/bebidas em nome do cliente.
2. O caixa usa `/bazar-sementinha/caixa` para selecionar um pedido específico ou todos os pedidos do cliente.
3. O pagamento pode ser Pix, crédito, débito ou dinheiro.
4. A coordenação usa `/bazar-sementinha/prestacao-contas` para acompanhar totais, despesas, planilha e PDF.
5. A gestão usa `/bazar-sementinha/gestao` para ajustar valores, categorias e cardápio.
