# Organização em Harmonia — Agenda Viva, eventos, aprovações e CEP

## Objetivo da atualização

Esta atualização evolui o módulo Agenda Viva para deixar de ser apenas uma visão de calendário e passar a operar o fluxo real de atividades/eventos da organização:

1. Cadastro da Organização com pesquisa de CEP.
2. Base Única com cadastro/edição de funções.
3. Agenda Viva com cadastro de atividades/eventos.
4. Solicitações pendentes de aprovação.
5. Aviso por e-mail e link de WhatsApp pré-preenchido para o aprovador.
6. Visual mensal mais bonito para Julho Cultural TUCXA.
7. Eventos iniciais do calendário cultural de julho.

## Arquivos principais alterados/criados

```txt
src/app/solucoes/organizacao-em-harmonia/cliente/cadastro/page.tsx
src/app/solucoes/organizacao-em-harmonia/cliente/base-unica/page.tsx
src/app/solucoes/organizacao-em-harmonia/cliente/agenda-viva/page.tsx
src/app/api/organizacao-em-harmonia/cliente/base-unica/route.ts
src/app/api/organizacao-em-harmonia/cliente/agenda-viva/route.ts
src/lib/mail.ts
supabase/sql/20260628_15_organizacao_em_harmonia_base_unica.sql
.env.example
```

## Atualização local

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-oh-agenda-viva-eventos.zip -Force
```

Extraia o ZIP atualizado por cima da pasta do projeto.

Depois rode:

```powershell
npm run lint
npm run build
npm run dev
```

## Supabase

Rode novamente no SQL Editor:

```txt
supabase/sql/20260628_15_organizacao_em_harmonia_base_unica.sql
```

Valide os novos tipos/eventos:

```sql
select slug, name, requires_approval
from public.agv_event_types
where organization_id = (select id from public.oh_organizations where slug = 'tucxa')
order by sort_order;

select title, starts_at, status, metadata
from public.agv_events
where organization_id = (select id from public.oh_organizations where slug = 'tucxa')
  and metadata->>'source' = 'Julho Cultural Tucxa 2026'
order by starts_at;
```

## Variáveis de ambiente

Para os testes, use o WhatsApp do Márcio como aprovador:

```env
OH_AGENDA_APPROVER_EMAIL=automacao.ao.extremo@gmail.com
OH_AGENDA_APPROVER_WHATSAPP=19992360856
```

Também inclua essas variáveis na Vercel.

## Testes recomendados

### 1. Cadastro da Organização / CEP

Acesse:

```txt
/solucoes/organizacao-em-harmonia/cliente/cadastro
```

Teste:

1. Informar CEP com 8 dígitos.
2. Sair do campo ou clicar em **Pesquisar CEP**.
3. Conferir preenchimento automático de endereço, cidade e UF.
4. Informar número e complemento.
5. Salvar.

### 2. Base Única / Funções

Acesse:

```txt
/solucoes/organizacao-em-harmonia/cliente/base-unica
```

Teste:

1. Cadastrar função nova, por exemplo `Aprovador de eventos`.
2. Editar descrição.
3. Inativar/ativar.
4. Associar a função a um envolvido.
5. Marcar `Pode aprovar eventos` no vínculo operacional.

### 3. Agenda Viva / atividades e eventos

Acesse:

```txt
/solucoes/organizacao-em-harmonia/cliente/agenda-viva
```

Teste:

1. Criar evento `Teste de aprovação Agenda Viva`.
2. Selecionar tipo de atividade.
3. Informar data/horário.
4. Marcar `Precisa de aprovação`.
5. Enviar para aprovação.
6. Conferir se aparece mensagem e botão para enviar a solicitação também pelo WhatsApp.
7. Conferir e-mail recebido no aprovador.
8. Aprovar, pedir ajuste ou reprovar.
9. Conferir mudança de status.
10. Conferir visual do calendário de Julho 2026.

## GitHub

```powershell
git checkout feature/organizacao-em-harmonia

git status
git add .
git commit -m "Evolui Agenda Viva com eventos aprovacoes CEP e funcoes"
git push origin feature/organizacao-em-harmonia
```

## Vercel

Depois do push, valide o Preview. Quando estiver tudo certo:

```powershell
npx vercel --prod
```
