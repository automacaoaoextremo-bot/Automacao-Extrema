# Passo a passo — Link público de confirmações do Presença Querida

## O que este pacote adiciona

Cria um link público, sem login, para acompanhar as confirmações de presença do evento.

URL pública:

```text
/solucoes/presenca-querida/confirmacoes/TOKEN
```

Esse link é somente leitura. Ele não permite:

- alterar respostas;
- limpar testes;
- editar convidados;
- aprovar/reprovar mensagens;
- excluir registros;
- executar ações administrativas.

## Arquivos incluídos

```text
src/app/solucoes/presenca-querida/confirmacoes/[token]/page.tsx
src/app/solucoes/presenca-querida/cliente/confirmacoes/page.tsx
src/app/api/presenca-querida/cliente/confirmations/route.ts
src/lib/presenca-querida.ts
supabase/sql/20260628_16_presenca_querida_link_publico_confirmacoes.sql
```

## Como aplicar

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Descompacte o ZIP na raiz do projeto, permitindo sobrescrever os arquivos existentes.

## SQL obrigatório

Antes de testar a área de confirmações, rode no Supabase SQL Editor:

```text
supabase/sql/20260628_16_presenca_querida_link_publico_confirmacoes.sql
```

Esse SQL cria no `pq_events`:

```text
public_confirmation_token
public_confirmation_enabled
```

E gera um token público para os eventos já cadastrados.

## Validação local

Depois de aplicar o ZIP e rodar o SQL:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Como testar

Entre na área logada:

```text
/solucoes/presenca-querida/cliente/confirmacoes
```

Clique em:

```text
Copiar link público de confirmações
```

Abra o link em uma janela anônima ou em outro navegador.

## O que aparece no link público

O painel público mostra:

- total de convidados;
- confirmados;
- talvez;
- pendentes;
- não poderão ir;
- total de adultos e crianças previstos;
- taxa de resposta;
- lista de convidados com status;
- WhatsApp mascarado;
- próximos lembretes previstos por público/status.

## Observações de segurança

O link público usa token UUID e não exige login, mas é somente leitura. Compartilhe apenas com pessoas que podem acompanhar o andamento das confirmações.

Para desativar o link público de confirmações de um evento, rode:

```sql
update pq_events
set public_confirmation_enabled = false
where slug = 'daniela-50-anos';
```

Para reativar:

```sql
update pq_events
set public_confirmation_enabled = true
where slug = 'daniela-50-anos';
```

## Deploy

Depois de validar localmente:

```powershell
git status
git add .
git commit -m "feat: adiciona link publico de confirmacoes Presenca Querida"
git push origin main
```

A Vercel fará o deploy automaticamente se o projeto estiver conectado ao GitHub.
