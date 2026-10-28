# Automação Extrema — Memórias que Encantam | V9 / Ajustes 07

**Escopo:** 16 fotografias das cantigas; curadoria de desenhos e letras por música, múltiplas versões, página pública mobile-first, galeria e ampliação, sem regressão dos áudios/QR Codes.

**Branch exclusiva:** `fix/memorias-lu-20261025-v1`.

## 1. Política de privacidade e publicação

- **Nunca** salvar desenhos e vozes infantis em `public/` do Next.js nem incluir em GitHub.
- As 16 fotos fornecidas são **rascunhos para revisão**, não estão autorizadas automaticamente para publicação.
- O bucket `education-illustrations-private` é privado; a API emite URLs temporárias com prazo de 300 segundos.
- No painel Docentes, uma foto só poderá ser mostrada ao público se: `status=available`, `is_published=true`, `projects.illustrations_released=true` e `projects.media_authorized=true`.
- A seleção de uma foto principal não equivale à aprovação ou à liberação pública.
- A Lu deve revisar cada desenho com atenção a nomes manuscritos, dados pessoais e direitos de reprodução das letras e obter a autorização pertinente da escola/responsáveis.
- O upload via navegador converte para JPEG, redimensiona e retira metadados EXIF/GPS; isso **não oculta nomes escritos na folha**. Para ocultar informações visíveis, edite a imagem antes de subir.
- O script de importação inicial faz somente rascunhos privados. Não use em contas ou projetos diferentes sem revisão.

## 2. Arquivos da atualização

Atualizados:

- `src/components/education/lu-curation.tsx`
- `src/components/education/lu-music-experience.tsx`
- `src/lib/education/lu-storage.ts`
- `src/app/solucoes/memorias-que-encantam/livro/lu-2026/api/route.ts`
- `src/app/solucoes/memorias-que-encantam/livro/lu-2026/lu-music.css`

Novos:

- `src/components/education/lu-illustration-curation.tsx`
- `src/lib/education/lu-illustrations.ts`
- `src/app/solucoes/memorias-que-encantam/livro/lu-2026/api/illustrations/{upload-token,complete,action}/route.ts`
- `supabase/migrations/20261027190000_ae_education_lu_illustrations_v9.sql`
- `scripts/educacao/importar_lu_ilustracoes_v9.mjs`
- Este guia.

## 3. Instalação e testes locais

1. Copiar ZIP de código e `.ps1` para `C:\Users\lacos\Documents\zips` e `C:\Users\lacos\Documents\scripts`.
2. No worktree `C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias`, confirmar `git branch --show-current` = `fix/memorias-lu-20261025-v1`. Inspecionar `git status`.
3. Executar `instalar_memorias_lu_v9_ilustracoes_07.ps1 -RepoPath ... -ZipPath ...` com `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ...`.
4. `npx eslint src/components/education src/lib/education src/app/solucoes/memorias-que-encantam`
5. `npx tsc --noEmit`
6. `npm run build`

**Não avance se falhar qualquer comando.** O instalador verifica branch, hashes de todos os arquivos e versões-base, e cria backup. Não faz commit, migração nem deploy.

## 4. Migração do Supabase — ANTES do deploy

No projeto de Supabase usado por Production, faça backup e execute uma vez no SQL Editor:
`supabase/migrations/20261027190000_ae_education_lu_illustrations_v9.sql`

A migração adiciona `ae_education_projects.illustrations_released` com valor inicial `false`, tabela `ae_education_illustration_versions`, função RPC `ae_education_feature_illustration` e bucket privado.

### Verificações de leitura

```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name='ae_education_projects'
  and column_name = 'illustrations_released';
select id,public,file_size_limit from storage.buckets
where id='education-illustrations-private';
select count(*) from public.ae_education_illustration_versions
where project_slug='lu-2026';
select slug,media_authorized,family_released,illustrations_released
from public.ae_education_projects where slug='lu-2026';
```

Esperado: bucket `public=false`, `illustrations_released=false`, sem registros de fotos ainda.

## 5. Homologação segura / Preview

1. Criar commit na branch, fazer push e aguardar Vercel Preview `Ready`.
2. Confirmar variáveis Supabase necessárias no Preview. **Preview não é necessariamente banco isolado**. Se usar banco de produção, testes de gravação alteram dados reais: criar projeto de teste/ambiente separado ou aguardar homologação controlada em Production.
3. Área Docentes no celular: abrir **Definir Desenhos e Letras**, alternar as 12 músicas, enviar uma foto, pré-visualizar página completa, definir principal, adicionar segunda versão, ocultar, restaurar, excluir e trocar associação. Conferir erro para arquivo inválido.
4. Confirmar que **nenhuma imagem aparece na página pública sem aprovação individual e liberação geral**.
5. Publicar uma foto fictícia de teste em ambiente isolado e verificar miniatura na lista, imagem no player, galeria, zoom e mobile. Em produção, testar somente com conteúdo aprovado pela escola.
6. Confirmar que as vozes, playlist, QR Codes, ordenação e autenticação dos docentes continuam corretos.
7. Em caso de teste com Preview e o mesmo Supabase de produção, **não** autorizar ou divulgar material real antes da revisão.

## 6. Importar as 16 fotos recebidas, sempre PRIVADAS

O ZIP separado `lu-16-fotos-privadas-para-curadoria-v9.zip` contém imagens JPEG reduzidas/sem EXIF e o arquivo `MAPEAMENTO_PARA_CONFERIR.json`. Não o versione.

Após configurar o Supabase e criar um backup, extraia as fotos para `C:\Users\lacos\Documents\zips\lu-16-fotos-privadas-v9`.

Faça primeiro a leitura dos títulos do mapeamento; algumas associações, como **Eufruxa**, **O Pato**, **Tique Ti Ta** e **A Casa**, são preliminares. A Lu poderá mover imagens na curadoria se a associação não for correta.

A importação opcional usa os dados do `.env.local` local, nunca os valores expostos em respostas de ChatGPT:

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias'
node --env-file=.env.local scripts/educacao/importar_lu_ilustracoes_v9.mjs --pasta 'C:\Users\lacos\Documents\zips\lu-16-fotos-privadas-v9' --confirmar-importacao-privada
```

Caso `.env.local` não exista, configurar as duas variáveis em um ambiente local seguro. A rotina insere registros `status=available`, `is_featured=false`, `is_published=false`, sem liberar imagens. **Não execute novamente se a primeira importação falhar sem investigar**; o script ignora arquivos já importados pelo nome.

Se preferir, a Lu pode enviar as imagens uma a uma no próprio celular em **Docentes → Definir Desenhos e Letras**. Não é necessário rodar importador.

## 7. Publicação via GitHub / Vercel

Com commits locais e worktree limpo:

```powershell
git fetch origin --prune
git rev-list --left-right --count origin/main...HEAD
```

Se a `main` tiver avançado, fazer `git merge origin/main`, solucionar conflitos com revisão e repetir lint/tsc/build. Fazer `git push origin fix/memorias-lu-20261025-v1`. Criar PR **base `main`** e **compare `fix/memorias-lu-20261025-v1`**. Revisar os diffs de todos os arquivos, passar checks e homologar Preview. Só então realizar merge e conferir Vercel `Production / Ready`.

**Após a publicação:** o site público e a área Docentes estarão preparados, mas **nada será liberado automaticamente**. A liberação das ilustrações depende de ação consciente da Lu na área Docentes, após autorização/revisão.

## 8. Possível reversão

Se houver problema de interface, reverter o commit da V9 via PR para `main` (sem apagar a tabela e o bucket, pois contêm arquivos potencialmente importados). Para interromper imediatamente a exibição de desenhos, desativar `illustrations_released` no painel docente ou, em contingência administrativa, no SQL Editor. Evite exclusões de dados em produção.

## 9. Limitações conhecidas

- O JPEG preserva a página com a letra como **imagem**, não há transcrição automática. Direitos autorais e legibilidade devem ser conferidos manualmente.
- Fotos HEIC podem não converter em todos os navegadores; use JPEG/PNG.
- URLs assinadas expiram em 5 minutos; a ampliação pública renova o URL ao abrir.
- Não foram executados testes end-to-end de navegação nos dispositivos da escola neste ambiente; homologação da Lu é indispensável.
