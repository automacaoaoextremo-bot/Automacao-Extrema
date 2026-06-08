# Passo a passo — Ajustes Presença Querida / Gestão multi-solução AE

Esta atualização prepara a Automação Extrema para receber a Presença Querida como primeira migração dentro de uma base multi-solução, mantendo padrão mobile-friendly, cadastros reutilizáveis e estratégia de Oceano Azul/Deep Dive.

## 1. O que foi incluído

### Novas telas de Gestão

- `/admin/ae/catalogo`
  - Cadastro de públicos alvo.
  - Cadastro de dores.
  - Cadastro de funcionalidades.
  - Edição, inclusão e arquivamento seguindo padrão de cadastro.

- `/admin/ae/parceiros`
  - Cadastro de cerimonialistas, ONGs, buffets, indicadores e outros parceiros.
  - Campo de percentual de comissão por aquisição.
  - Status para ativo, em validação, pausado e arquivado.

- `/admin/ae/sites-clientes`
  - Cadastro de sites/páginas de clientes associados a uma solução.
  - Controle de URL atual, caminho público, tipo de página e status de migração.

- `/admin/ae/solucoes/[id]`
  - Edição completa da solução.
  - Associação da solução aos públicos, dores e funcionalidades do catálogo central.
  - Visualização dos sites/páginas de clientes vinculados.

### Telas atualizadas

- `/admin/ae`
  - Dashboard com atalhos para catálogo, parceiros e sites de clientes.
  - Menu lateral/drawer mobile para navegação da gestão.

- `/admin/ae/solucoes`
  - Lista atualizada com descrição curta, público, dores, status e prioridade.

- `/admin/ae/solucoes/nova`
  - Cadastro de nova solução já com associação a públicos, dores e funcionalidades.

## 2. SQL novo no Supabase

Antes de subir o projeto para Vercel, rode o script abaixo no Supabase SQL Editor:

```txt
supabase/sql/20260608_catalogo_multi_solucoes_presenca_querida.sql
```

Esse script cria e carrega:

- `ae_target_audiences`
- `ae_pains`
- `ae_features`
- `ae_solution_target_audiences`
- `ae_solution_pains`
- `ae_solution_features`
- `ae_partners`
- `ae_solution_partners`
- `ae_client_sites`

Ele também faz carga inicial a partir da planilha `AE - Soluções`, incluindo soluções, públicos, dores, funcionalidades, sites de clientes e parceiros iniciais.

## 3. Como atualizar o projeto local

1. Faça backup da pasta atual do projeto.
2. Copie os arquivos deste ZIP por cima da pasta local `Automacao-Extrema`.
3. No Supabase, abra o SQL Editor.
4. Rode o arquivo:

```txt
supabase/sql/20260608_catalogo_multi_solucoes_presenca_querida.sql
```

5. No terminal, na raiz do projeto:

```powershell
npm install
npm run lint
npm run build
```

6. Suba para o GitHub:

```powershell
git status
git add .
git commit -m "Adiciona gestao multi-solucoes Presenca Querida"
git push
```

7. Aguarde o deploy da Vercel.

## 4. Validação depois do deploy

Acesse:

```txt
https://www.automacaoextrema.com/admin/ae
```

Valide:

- O menu lateral aparece no desktop.
- O botão de menu aparece no mobile.
- `/admin/ae/catalogo` lista públicos, dores e funcionalidades.
- `/admin/ae/solucoes` lista as soluções da planilha.
- Ao abrir uma solução, é possível marcar/desmarcar públicos, dores e funcionalidades.
- `/admin/ae/sites-clientes` lista as páginas importadas da planilha.
- `/admin/ae/parceiros` mostra os parceiros iniciais e permite incluir outros.

## 5. Observação estratégica

Estes ajustes não migram ainda toda a operação específica da Presença Querida, como convidados, RSVP, mensagens por evento e recados. Eles criam a base de Gestão AE para receber a Presença Querida como módulo, mantendo o controle central de soluções, clientes, páginas, públicos, dores, funcionalidades e parceiros.

A próxima fase recomendada é migrar o núcleo operacional da Presença Querida:

1. Clientes e eventos.
2. Convidados e RSVP.
3. Mensagens por fase.
4. Recados/depoimentos.
5. Relatórios do evento.
6. Área Cliente por solução/evento.
