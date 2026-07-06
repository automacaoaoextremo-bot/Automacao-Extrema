# Passo a passo — ajustes mobile, WhatsApp e confirmação individual

## O que este pacote corrige

1. **Cabeçalho mobile mais compacto**
   - A linha de links/âncoras da landing ficou mais baixa no mobile.
   - Os botões usam menos altura, padding e espaçamento para liberar mais conteúdo na primeira dobra.

2. **Copiar mensagens para WhatsApp**
   - Na tela `Mensagens > Convites para aprovação`, cada convite agora tem o botão **Copiar WhatsApp**.
   - O botão copia o texto completo da mensagem do convidado para a área de transferência.
   - Também foi incluído botão de cópia nos modelos por fase.

3. **Link do WhatsApp abre no início da landing**
   - A geração dos convites não usa mais `#confirmacao` no final do link.
   - O convidado abre a landing no começo, conhece a festa e só depois chega ao bloco de confirmação no final.
   - A rota antiga `/solucoes/presenca-querida/confirmar/[token]` também redireciona para o início da landing, sem âncora.

4. **Confirmação individual para convidados vinculados**
   - Quando o convite tem mais de uma pessoa, a LP mostra cada convidado separadamente.
   - A pessoa pode marcar, para cada nome:
     - `Sim, confirma presença`
     - `Talvez consiga ir`
     - `Não poderá ir`
     - `Decidir depois`
   - Isso permite, por exemplo, Letícia confirmar por ela agora e deixar Gabriel como pendente até 19/11/2026.

5. **Campo de recado sem texto indevido**
   - O campo **Curiosidade ou recado para a Daniela** não vem mais preenchido com texto de teste ou observação interna do cadastro.
   - Ele começa vazio e mostra apenas o placeholder orientativo.

---

## Arquivos incluídos

- `src/components/ae-solution-header.tsx`
- `src/lib/presenca-daniela50.ts`
- `src/components/presenca-public-confirmation.tsx`
- `src/app/api/presenca-querida/confirmar/[token]/route.ts`
- `src/app/solucoes/presenca-querida/confirmar/[token]/page.tsx`
- `src/app/solucoes/presenca-querida/cliente/mensagens/page.tsx`
- `src/app/solucoes/presenca-querida/evento/[slug]/page.tsx`
- `src/app/api/presenca-querida/cliente/messages/generate-invitations/route.ts`

Não há SQL obrigatório nesta atualização.

---

## Como aplicar

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Descompacte o ZIP na raiz do projeto, permitindo sobrescrever os arquivos existentes.

---

## Validação local

Depois de substituir os arquivos:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

---

## Testes recomendados

### 1. Gerar convites novamente
Acesse:

```text
/solucoes/presenca-querida/cliente/mensagens
```

Clique em **Gerar convites personalizados**.

Confira se o link gerado termina assim:

```text
/solucoes/presenca-querida/evento/daniela-50-anos?convite=TOKEN
```

Ele **não deve** terminar com:

```text
#confirmacao
```

### 2. Copiar mensagem
Na lista de convites, clique em **Copiar WhatsApp** e cole a mensagem em um bloco de notas ou no WhatsApp para validar.

### 3. Testar convite com vínculo
Abra um link como:

```text
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos?convite=TOKEN
```

Role até o final da LP e confira se aparecem respostas separadas para o convidado principal e os vinculados.

### 4. Testar resposta individual
Exemplo:

- Letícia: `Sim, confirma presença`
- Gabriel: `Decidir depois`

Clique em **Registrar minhas respostas**.

Depois confira no Supabase se cada pessoa ficou com status individual em `pq_guests`.

### 5. Campo de recado
O campo **Curiosidade ou recado para a Daniela** deve aparecer vazio, apenas com o placeholder:

```text
Deixe aqui uma curiosidade sua com a aniversariante ou um recado carinhoso.
```

---

## Deploy

Se tudo passar localmente:

```powershell
git status
git add .
git commit -m "Ajusta mobile, cópia de WhatsApp e confirmação individual no Presença Querida"
git push origin main
```

A Vercel deve publicar automaticamente se o projeto estiver conectado ao GitHub.
