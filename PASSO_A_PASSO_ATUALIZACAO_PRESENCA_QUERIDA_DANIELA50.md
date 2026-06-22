# Atualização — Presença Querida | Daniela 50 anos

Este pacote adiciona a etapa do case real **Daniela 50 anos** dentro do Presença Querida, com landing pública do evento, cadastro mais completo, convidados com parentesco/relacionamento, importação CSV, menu lateral, fotos, cardápio e aprovação dos convites personalizados antes do envio.

## 1. Arquivos alterados e novos

Substituir/adicionar os arquivos do ZIP na raiz do projeto `automacao-extrema`.

Principais grupos incluídos:

- `src/components/presenca-client-header.tsx`
- `src/lib/presenca-querida.ts`
- `src/lib/presenca-daniela50.ts`
- `src/lib/presenca-auth.ts`
- `src/app/solucoes/presenca-querida/cliente/**`
- `src/app/solucoes/presenca-querida/confirmar/[token]/page.tsx`
- `src/app/solucoes/presenca-querida/evento/[slug]/page.tsx`
- `src/app/api/presenca-querida/cliente/**`
- `src/app/api/presenca-querida/eventos/[slug]/route.ts`
- `src/app/api/presenca-querida/confirmar/[token]/route.ts`
- `public/presenca-querida/daniela-50-anos/**`
- `supabase/sql/20260622_08_presenca_querida_daniela50_ajustes.sql`

## 2. Aplicar no projeto

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Descompacte o ZIP na raiz, permitindo sobrescrever arquivos.

## 3. Rodar SQL no Supabase

No Supabase SQL Editor, rode:

```sql
supabase/sql/20260622_08_presenca_querida_daniela50_ajustes.sql
```

Este script:

- adiciona campos novos em `pq_events` para landing, Google Maps, fotos, atrações, buffet, cardápio e privacidade;
- adiciona campos em `pq_guests` para parentesco, origem do relacionamento, contexto do convite, aprovação e ativação/inativação;
- adiciona campos em `pq_guest_messages` para aprovação dos convites personalizados;
- cria/atualiza a landing do evento `daniela-50-anos`;
- inclui exemplos de convidados para validação;
- atualiza a view `pq_v_dashboard_events` para ignorar convidados inativos.

## 4. Validar localmente

```powershell
npm run lint
npm run build
npm run dev
```

## 5. Testar rotas principais

Área do cliente:

```txt
http://localhost:3000/solucoes/presenca-querida/cliente
http://localhost:3000/solucoes/presenca-querida/cliente/cadastro
http://localhost:3000/solucoes/presenca-querida/cliente/convidados
http://localhost:3000/solucoes/presenca-querida/cliente/mensagens
```

Landing pública do evento:

```txt
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos
```

Template CSV:

```txt
http://localhost:3000/api/presenca-querida/cliente/guests/template
```

Confirmação individual:

```txt
http://localhost:3000/solucoes/presenca-querida/confirmar/TOKEN_DO_CONVIDADO
```

Para testar o token:

```sql
select full_name, individual_token
from public.pq_guests
where event_id = (select id from public.pq_events where slug = 'daniela-50-anos')
order by created_at desc;
```

## 6. Fluxo recomendado de teste

1. Entrar na área do cliente.
2. Abrir **Cadastro**.
3. Clicar em **Aplicar dados Daniela 50**.
4. Salvar.
5. Abrir a landing pública e conferir fotos, Chácara Piloto, Google Maps, banda, DJ, buffet, chopp e cardápio.
6. Abrir **Convidados**.
7. Baixar o template CSV.
8. Importar convidados ou cadastrar manualmente.
9. Preencher parentesco ou origem do relacionamento.
10. Abrir **Mensagens**.
11. Clicar em **Gerar convites personalizados**.
12. Revisar cada convite.
13. Aprovar apenas os convites prontos para envio.
14. Abrir um link individual e testar a confirmação.

## 7. Deploy na Vercel

Depois da validação local:

```powershell
git status
git add .
git commit -m "feat: ajusta Presença Querida para Daniela 50 anos"
git push origin main
```

A Vercel deverá publicar automaticamente se o projeto estiver conectado ao GitHub.

## 8. Observações importantes

- As fotos anexadas foram colocadas em `public/presenca-querida/daniela-50-anos/`.
- O upload na área do cliente salva imagens como Data URL no cadastro do evento. Para escala comercial, a próxima evolução recomendada é migrar esse upload para Supabase Storage.
- A etapa de aprovação dos convites personalizados foi criada em `Mensagens`, antes do envio pelo WhatsApp.
- O BotConversa ainda deve enviar somente mensagens aprovadas, usando os textos salvos em `pq_guest_messages` com `approval_status = 'aprovado'`.
