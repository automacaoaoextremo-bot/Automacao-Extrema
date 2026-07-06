# Atualização — Organização em Harmonia: localidades, filtros e calendário visual

## Objetivo

Esta atualização ajusta três pontos da validação da Organização em Harmonia / Agenda Viva:

1. Corrigir o erro ao salvar uma nova localidade.
2. Melhorar a tela de Envolvidos com filtros por busca, função, módulos, grupo, dias de atuação e vínculos operacionais.
3. Evoluir o calendário visual de Julho Cultural TUCXA, permitindo imagem/ícone por atividade e apresentação mais próxima do material visual usado pelo Tucxa.

## Arquivos principais alterados

```txt
src/app/api/organizacao-em-harmonia/cliente/base-unica/route.ts
src/app/api/organizacao-em-harmonia/cliente/agenda-viva/route.ts
src/app/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos/page.tsx
src/app/solucoes/organizacao-em-harmonia/cliente/agenda-viva/page.tsx
supabase/sql/20260628_15_organizacao_em_harmonia_base_unica.sql
```

## 1. Localidades

A API da Base Única foi ajustada para tratar melhor a ação `upsertLocation`.

Melhorias:

- payload mais defensivo para campos opcionais;
- tratamento mais claro de erro retornado pelo Supabase;
- sincronização da localidade principal com o cadastro da organização;
- preservação da possibilidade de múltiplas localidades.

Rode novamente o SQL principal no Supabase para garantir que `oh_locations` esteja criada/atualizada:

```txt
supabase/sql/20260628_15_organizacao_em_harmonia_base_unica.sql
```

Validação sugerida:

```sql
select name, location_type, zip_code, address, number, city, state, is_primary, active
from public.oh_locations
where organization_id = (select id from public.oh_organizations where slug = 'tucxa')
order by is_primary desc, name;
```

## 2. Envolvidos

A tela de Envolvidos ganhou filtros antes da lista:

- busca por nome, e-mail, WhatsApp ou vínculo;
- status;
- função;
- módulo liberado;
- vínculo operacional;
- grupo de quinta-feira;
- dia de atuação;
- entidade ou linha de trabalho.

Isso ajuda a responder perguntas como:

- quem é cambono?
- quem é cavalinho?
- quem participa do Grupo 1?
- quem atua na segunda-feira?
- quem pode aprovar eventos?
- quem está vinculado a determinada linha/entidade?

## 3. Agenda Viva — calendário visual

A tela do Agenda Viva ganhou um calendário visual mais próximo do modelo “Julho Cultural TUCXA”.

No cadastro de atividade/evento, foram adicionados:

- emoji/ícone curto;
- imagem do evento por URL;
- opção de selecionar imagem local para teste;
- texto alternativo da imagem;
- opção “Destacar no calendário visual”.

Observação: a imagem local selecionada é convertida para data URL e salva no metadata do evento. Isso funciona para validação, mas para produção o recomendado é migrar para Supabase Storage.

## 4. Testes locais

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
npm run lint
npm run build
npm run dev
```

Testes no navegador:

```txt
/solucoes/organizacao-em-harmonia/cliente/base-unica/localidades
/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos
/solucoes/organizacao-em-harmonia/cliente/agenda-viva
```

## 5. GitHub e Vercel

```powershell
git checkout feature/organizacao-em-harmonia

git status
git add .
git commit -m "Ajusta localidades filtros e calendario visual da Organizacao em Harmonia"
git push origin feature/organizacao-em-harmonia
```

Depois valide o Preview da Vercel. Para produção:

```powershell
npx vercel --prod
```
