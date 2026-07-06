# Passo a passo — Organização em Harmonia + Agenda Viva + regras do Tucxa

## Objetivo desta atualização

Esta atualização evolui a Organização em Harmonia para preparar a validação do Tucxa, priorizando o módulo Agenda Viva e mantendo a Base Única como núcleo compartilhado.

Principais ajustes:

1. O checklist agora direciona **Completar dados da organização** para a nova tela **Cadastro**.
2. Criada a tela `/solucoes/organizacao-em-harmonia/cliente/cadastro`.
3. A Base Única passou a registrar vínculos operacionais para o Agenda Viva:
   - cavalinho;
   - entidades que recebe;
   - linhas de trabalho;
   - cambono;
   - entidades que costuma cambonar;
   - cambono volante/reserva;
   - apoio na recepção;
   - apoio na organização;
   - participação segunda/terça/quarta/quinta;
   - Grupo 1, Grupo 2 ou ambos;
   - permissão para aprovar eventos, alterar calendário e ver relatórios.
4. A importação CSV de envolvidos foi ampliada com esses campos.
5. O Agenda Viva ganhou uma visão mobile-first com:
   - próximos dias;
   - vínculos operacionais;
   - visão anual compacta inspirada no calendário do Tucxa;
   - legenda por tipo de atividade;
   - tipos de atividades iniciais.
6. O SQL foi ampliado com `agenda_viva_profile` em `oh_memberships` e seeds iniciais do Agenda Viva.

## Atualização local

Na pasta do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Faça backup:

```powershell
Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-oh-agenda-viva-regras.zip -Force
```

Extraia o ZIP atualizado por cima da pasta atual.

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

Valide as novas estruturas:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'oh_memberships'
  and column_name = 'agenda_viva_profile';

select title, group_slug, recurrence_rule, metadata
from public.agv_events
where organization_id = (select id from public.oh_organizations where slug = 'tucxa')
order by created_at desc;
```

## Testes recomendados

1. Entrar em `/solucoes/organizacao-em-harmonia/login`.
2. Acessar o Painel.
3. Clicar em **Resolver agora** no card **Completar dados da organização**.
4. Confirmar se abre `/solucoes/organizacao-em-harmonia/cliente/cadastro`.
5. Salvar dados básicos da organização.
6. Acessar **Base Única**.
7. Criar um envolvido marcando:
   - é cavalinho;
   - entidades;
   - participa segunda/terça/quinta;
   - Grupo 1 ou Grupo 2.
8. Criar outro envolvido como cambono e apoio recepção.
9. Baixar o modelo CSV.
10. Importar uma planilha de teste.
11. Acessar **Agenda Viva** e validar as visões de próximos dias e calendário anual compacto.

## GitHub

```powershell
git checkout feature/organizacao-em-harmonia

git status
git add .
git commit -m "Evolui Agenda Viva com regras do Tucxa e Base Unica operacional"
git push origin feature/organizacao-em-harmonia
```

## Vercel

Valide o Preview da branch. Quando estiver pronto para produção:

```powershell
npx vercel --prod
```

## Observação de produto

A Base Única continua sendo o núcleo interno compartilhado da suíte. O Agenda Viva deve consumir os dados de envolvidos, funções, grupos e permissões sem repetir cadastro em outro módulo.
