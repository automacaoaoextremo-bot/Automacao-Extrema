# Organização em Harmonia — Base Única, localidades, entidades, vínculos e CRM

## Objetivo desta atualização

Esta atualização evolui a Organização em Harmonia para reduzir confusão nos cadastros e preparar o Agenda Viva para uso real no Tucxa.

Inclui:

1. opção de arquivar/excluir leads no Funil / CRM da AE;
2. cadastro de múltiplas localidades da organização;
3. Base Única separada em páginas menores;
4. cadastro de funções;
5. cadastro de entidades/linhas de trabalho;
6. vínculos em lote para várias pessoas;
7. área de orientações/documentos com conteúdo operacional do Tucxa;
8. SQL idempotente para localidades e entidades.

## Atualização local

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-oh-base-unica-funcoes-entidades-localidades.zip -Force
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

Valide:

```sql
select name, city, state, is_primary, active
from public.oh_locations
where organization_id = (select id from public.oh_organizations where slug = 'tucxa')
order by is_primary desc, name;

select name, line, entity_type, active
from public.oh_spiritual_entities
where organization_id = (select id from public.oh_organizations where slug = 'tucxa')
order by name;
```

## Telas novas/ajustadas

```txt
/solucoes/organizacao-em-harmonia/cliente/base-unica
/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos
/solucoes/organizacao-em-harmonia/cliente/base-unica/funcoes
/solucoes/organizacao-em-harmonia/cliente/base-unica/entidades
/solucoes/organizacao-em-harmonia/cliente/base-unica/grupos
/solucoes/organizacao-em-harmonia/cliente/base-unica/vinculos
/solucoes/organizacao-em-harmonia/cliente/base-unica/localidades
/solucoes/organizacao-em-harmonia/cliente/base-unica/orientacoes
/admin/ae/funil
```

## Testes recomendados

1. Entrar no cliente Organização em Harmonia.
2. Acessar Cadastro e salvar a sede principal.
3. Acessar Base Única → Localidades e adicionar uma segunda localidade.
4. Acessar Funções e criar uma função personalizada.
5. Acessar Entidades e criar uma entidade/linha.
6. Acessar Envolvidos e cadastrar pessoa com função e vínculos.
7. Acessar Vínculos em lote e aplicar grupo/dias/módulos para várias pessoas.
8. Acessar Orientações e validar conteúdo operacional.
9. Acessar /admin/ae/funil e testar Arquivar/Excluir em um lead de teste.

## GitHub e Vercel

```powershell
git checkout feature/organizacao-em-harmonia

git status
git add .
git commit -m "Evolui Base Unica com funcoes entidades localidades e CRM"
git push origin feature/organizacao-em-harmonia
```

Depois valide o Preview da Vercel. Quando estiver pronto:

```powershell
npx vercel --prod
```
