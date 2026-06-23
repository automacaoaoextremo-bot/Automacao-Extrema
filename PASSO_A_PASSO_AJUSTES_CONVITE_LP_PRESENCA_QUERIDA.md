# Presença Querida — Ajustes convite curto, confirmação na LP e convidados vinculados

## Objetivo da atualização

Esta atualização ajusta o fluxo do case **Daniela 50 anos** para:

1. deixar a mensagem de WhatsApp curta;
2. explicar por que o convite está sendo enviado com antecedência, mesmo faltando cerca de seis meses;
3. concentrar os detalhes completos na landing page da festa;
4. eliminar a página intermediária de confirmação, redirecionando `/confirmar/[token]` para a LP;
5. colocar os botões de confirmação diretamente na landing page quando ela for aberta com `?convite=TOKEN`;
6. remover o botão genérico “Sim, vou com acompanhante(s)”;
7. permitir convidados vinculados ao convidado principal, como Leticia confirmando por ela e pelo Gabriel;
8. personalizar a mensagem conforme parentesco ou origem do relacionamento com a Daniela;
9. preparar a lógica de lembretes com prazo ideal de confirmação até **30/11/2026**.

## Arquivos alterados ou novos

Copie os arquivos do ZIP para a raiz do projeto, permitindo sobrescrever os existentes.

Arquivos principais:

```txt
src/lib/presenca-daniela50.ts
src/lib/presenca-querida.ts
src/components/presenca-public-confirmation.tsx
src/app/solucoes/presenca-querida/evento/[slug]/page.tsx
src/app/solucoes/presenca-querida/confirmar/[token]/page.tsx
src/app/api/presenca-querida/confirmar/[token]/route.ts
src/app/api/presenca-querida/cliente/guests/route.ts
src/app/api/presenca-querida/cliente/guests/import/route.ts
src/app/api/presenca-querida/cliente/guests/template/route.ts
src/app/api/presenca-querida/cliente/messages/generate-invitations/route.ts
src/app/solucoes/presenca-querida/cliente/convidados/page.tsx
src/app/solucoes/presenca-querida/cliente/confirmacoes/page.tsx
src/app/solucoes/presenca-querida/cliente/relatorios/page.tsx
src/app/solucoes/presenca-querida/cliente/page.tsx
src/app/solucoes/presenca-querida/cliente/primeiros-passos/page.tsx
src/app/solucoes/presenca-querida/page.tsx
supabase/sql/20260622_09_presenca_querida_convite_lp_confirmacao.sql
```

## Ordem recomendada

### 1. Criar branch

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

git checkout -b fix/presenca-querida-convite-lp
```

### 2. Descompactar o ZIP

Descompacte o arquivo:

```txt
ae-presenca-querida-convite-lp-confirmacao-20260622.zip
```

na raiz do projeto `automacao-extrema`, permitindo sobrescrever os arquivos existentes.

### 3. Rodar o SQL novo no Supabase

No Supabase SQL Editor, rode:

```txt
supabase/sql/20260622_09_presenca_querida_convite_lp_confirmacao.sql
```

Esse SQL adiciona:

```txt
primary_guest_id
household_label
is_invite_recipient
```

na tabela `pq_guests`.

Também cria índices, atualiza o texto público da landing, remove acompanhantes livres do case Daniela 50 e cria templates de lembrete.

### 4. Validar localmente

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Nesta preparação, `npm run lint` e `npx tsc --noEmit` passaram no ambiente de validação. O `next build` compilou a aplicação, mas o processo local do sandbox não concluiu a etapa final antes do timeout; por isso, rode o build completo no seu PC.

### 5. Testar rotas

Teste a landing pública:

```txt
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos
```

Depois, copie um `individual_token` de um convidado principal da tabela `pq_guests` e teste:

```txt
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos?convite=TOKEN#confirmacao
```

A confirmação deve aparecer diretamente na landing page.

A rota antiga também deve redirecionar:

```txt
http://localhost:3000/solucoes/presenca-querida/confirmar/TOKEN
```

para:

```txt
/solucoes/presenca-querida/evento/daniela-50-anos?convite=TOKEN#confirmacao
```

### 6. Testar convidados vinculados

Na área do cliente:

```txt
http://localhost:3000/solucoes/presenca-querida/cliente/convidados
```

Cadastre, por exemplo:

1. Leticia, com WhatsApp e “recebe convite próprio”;
2. Gabriel, sem WhatsApp, selecionando Leticia como “Convidado principal”.

Ao abrir a LP com o token da Leticia, a confirmação deve mostrar Leticia e Gabriel no mesmo convite.

### 7. Gerar convites personalizados

Na área:

```txt
http://localhost:3000/solucoes/presenca-querida/cliente/mensagens
```

Clique em **Gerar convites personalizados**.

Agora o texto de WhatsApp gerado será mais curto e apontará para:

```txt
/solucoes/presenca-querida/evento/daniela-50-anos?convite=TOKEN#confirmacao
```

em vez de usar a página intermediária.

## Nova mensagem de obrigado

Para quem confirmar presença, a mensagem exibida é:

```txt
Obrigado por confirmar. Mais perto da festa, vamos te mandar um lembrete carinhoso relembrando horário, local e orientações finais.
```

## Lógica de lembretes sugerida

Confirmados:

```txt
12/12/2026 — lembrete com horário, local e orientações finais
18/12/2026 — lembrete final curto
```

Talvez:

```txt
15/11/2026 — lembrete gentil
25/11/2026 — último lembrete antes do fechamento
30/11/2026 — prazo final
```

Pendentes:

```txt
10/11/2026 — primeiro lembrete
20/11/2026 — segundo lembrete
28/11/2026 — aviso de fechamento
30/11/2026 — prazo final
```

## Publicação

Após validar:

```powershell
git status
git add .
git commit -m "fix: ajusta convite e confirmação na LP do Presença Querida"
git push origin fix/presenca-querida-convite-lp
```

Abra o Pull Request, faça merge na `main` e acompanhe o deploy na Vercel.
