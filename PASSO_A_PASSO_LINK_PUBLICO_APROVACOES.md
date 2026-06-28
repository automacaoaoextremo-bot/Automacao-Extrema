# Passo a passo — Link público para acompanhar aprovações do Presença Querida

## O que esta atualização cria

Esta atualização cria um link público, somente leitura, para acompanhar as aprovações dos convites personalizados sem precisar fazer login.

URL criada pelo sistema:

```txt
/solucoes/presenca-querida/acompanhamento/TOKEN
```

Esse link mostra:

- total de convites personalizados;
- aprovados;
- pendentes;
- reprovados;
- inativos;
- convidados sem convite gerado;
- lista de convidados com status da aprovação.

Por segurança, o link público não mostra ações administrativas e não permite aprovar, reprovar, editar, excluir ou limpar dados. O WhatsApp aparece mascarado.

---

## Arquivos incluídos

```txt
src/app/solucoes/presenca-querida/acompanhamento/[token]/page.tsx
src/app/solucoes/presenca-querida/cliente/mensagens/page.tsx
src/app/api/presenca-querida/cliente/messages/route.ts
src/lib/presenca-querida.ts
supabase/sql/20260628_15_presenca_querida_link_publico_aprovacoes.sql
```

---

## Como aplicar

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Descompacte o ZIP na raiz do projeto, permitindo sobrescrever os arquivos existentes.

---

## Rodar SQL no Supabase

No Supabase SQL Editor, execute:

```txt
supabase/sql/20260628_15_presenca_querida_link_publico_aprovacoes.sql
```

Esse SQL cria no evento:

```txt
public_approval_token
public_approval_enabled
```

E gera um token público seguro para os eventos existentes.

---

## Como pegar o link público

Acesse a área logada:

```txt
/solucoes/presenca-querida/cliente/mensagens
```

Na tela **Mensagens**, aparecerá o bloco **Acompanhamento público** com o link e o botão:

```txt
Copiar link público
```

O link terá o formato:

```txt
https://www.automacaoextrema.com/solucoes/presenca-querida/acompanhamento/TOKEN
```

---

## Validação local

Depois de aplicar os arquivos e rodar o SQL:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Depois teste localmente:

```txt
http://localhost:3000/solucoes/presenca-querida/cliente/mensagens
```

Copie o link público exibido e abra em uma aba anônima, sem login.

---

## Deploy

Se tudo passar:

```powershell
git status
git add .
git commit -m "feat: cria link publico de acompanhamento das aprovacoes do Presenca Querida"
git push origin main
```

A Vercel fará o deploy automático se o projeto estiver conectado ao GitHub.
