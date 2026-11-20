# Memórias que Encantam — Professora Lu — V10 / Ajustes 08

**Branch**: `fix/memorias-lu-20261025-v1`  
**Data**: 30/10/2026  
**Escopo**: letras editáveis pela docente, exibição opcional durante reprodução e PDF do livro completo com 14 páginas (A4).

## 1. Mudanças entregues

- **Docentes → Configurar letras e legendas**: 12 cantigas, letra digitada e revisada pela escola, aprovação individual. Não cadastramos letras automaticamente.
- O texto pode conter marcadores **`[mm:ss] Texto do verso`**, um por linha, para exibir o verso adequado ao andamento da gravação. Também são aceitos milissegundos opcionais: `[mm:ss.mmm]`. Sem marcadores, o texto completo fica visível quando a família ativa a legenda. Os horários são ajustados pela docente por gravação selecionada; trocar o áudio pode exigir reajuste.
- **Player**: botão `CC Exibir letra durante a música`, independente do botão existente de ver desenhos e letras. A exibição é opt-in e não impede o áudio normal.
- **Docentes → Gerar livro musical em PDF**: 1 página de apresentação com QR geral, 1 índice com 12 QR Codes e 12 páginas individuais com desenho escolhido + QR específico. Mantém os IDs estáveis e os mesmos links dos QR Codes antigos.
- Geração somente por docente autenticado, com autorização de mídia e liberação geral das ilustrações. Exige uma ilustração disponível/publicada para **cada** cantiga; informa faltantes sem produzir arquivo incompleto.
- Os áudios e as ilustrações originais não são empacotados, gravados em `public/` nem baixados para o GitHub. Imagens privadas são buscadas pelo servidor por URL temporária, convertidas para JPEG comprimido em memória, e embutidas no PDF apenas após liberação.
- Preserva o endpoint antigo de QR Codes `/api/qr/pdf`.

## 2. Pré-requisitos

- Worktree: `C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias`.
- Branch **exatamente** `fix/memorias-lu-20261025-v1`; árvore sem alterações pendentes.
- Arquivos fonte correspondentes ao ZIP enviado em 30/10/2026. Instalador confere SHA-256 de todos os arquivos de base e da atualização e cria backup local.
- Node **24.x** (exigência `engines` do projeto). Dependências com `npm ci`.
- Supabase com migrações V1–V9 já aplicadas; URL e service role configuradas no Preview/Production.
- Para homologar sem tocar dados reais, usar outro banco Supabase na Vercel Preview. Uma *Preview deployment* não implica banco de homologação isolado.

## 3. Instalar localmente

Salve os arquivos recebidos assim:

- `C:\Users\lacos\Documents\zips\memorias-lu-ajustes-08-implementacao-v10.zip`
- `C:\Users\lacos\Documents\scripts\instalar_memorias_lu_ajustes_08_v10.ps1`

PowerShell:

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias'
git fetch origin
git branch --show-current
git status --short
git pull --ff-only origin fix/memorias-lu-20261025-v1

powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\Users\lacos\Documents\scripts\instalar_memorias_lu_ajustes_08_v10.ps1'

npm ci
npx eslint src/components/education src/lib/education src/app/solucoes/memorias-que-encantam
npx tsc --noEmit
npm run build
```

**Pare se qualquer teste falhar.** O instalador verifica branch, hashes e limpeza do Git. O backup fica em `C:\Users\lacos\Documents\zips\backup-memorias-lu-v10-<data>`. Ele não faz commit, não aplica SQL e não publica.

## 4. SQL de homologação ANTES do Preview

Em um banco de homologação independente (preferível), execute, no SQL Editor do Supabase, uma vez:

`supabase/migrations/20261030101000_ae_education_lu_lyrics_v10.sql`

Verifique:

```sql
SELECT to_regclass('public.ae_education_track_lyrics') AS lyrics_table;
SELECT count(*) AS total FROM public.ae_education_track_lyrics WHERE project_slug='lu-2026';
SELECT slug, media_authorized, family_released, illustrations_released
FROM public.ae_education_projects WHERE slug='lu-2026';
SELECT track_id, count(*) AS publicadas
FROM public.ae_education_illustration_versions
WHERE project_slug='lu-2026' AND status='available' AND is_published=true
GROUP BY track_id ORDER BY track_id;
```

A nova tabela inicia sem letras. **Não apague nem sobrescreva** áudios e ilustrações. Se a Vercel Preview já usa o banco de produção, a migração é aditiva, mas **qualquer alteração de letra feita no Preview altera dados de produção**. Use somente dados/contas de teste em banco separado ou restrinja os testes a conteúdo real autorizado.

## 5. Preview e homologação

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias'
git diff --check
git status --short
```

Adicione somente os arquivos da solucao e as dependencias:

```powershell
git add -- src/app/solucoes/memorias-que-encantam/livro/lu-2026 src/components/education src/lib/education
git add -- package.json package-lock.json supabase/migrations/20261030101000_ae_education_lu_lyrics_v10.sql docs/MEMORIAS_LU_V10_LEGENDAS_LIVRO_PDF_AJUSTES_08.md
git diff --cached --stat
git diff --cached --check
git commit -m 'feat(memorias-lu): legendas e livro PDF 14 paginas'
git push -u origin fix/memorias-lu-20261025-v1
```

No Vercel, abra o Preview desse commit e confira as variáveis de Preview. Teste no celular e desktop:

1. Acesso **Docentes** por celular; login, troca de senha e logout continuam funcionando.
2. **Configurar letras e legendas**: escolher 01 e 12, salvar rascunho sem aprovação; confirmar que não aparece na página pública. Marcar aprovada somente com texto autorizado; confirmar o botão `CC` em reprodução e na playlist.
3. Testar texto sem horários, depois com `[00:00]` e `[00:10]`. Pausar, avançar, voltar e trocar músicas; frases devem respeitar o tempo mostrado.
4. Verificar que letra de música sem aprovação não aparece publicamente; acessar página com sessão não docente para testar liberação.
5. **Gerar livro musical em PDF**: sem todos os desenhos autorizados deve mostrar quais faltam, **sem PDF**. Após validação das 12, deve baixar documento A4 de **14 páginas**.
6. Conferir títulos, desenhos, ordem definida pela professora, destino do QR geral e dos 12 QR individuais (identificadores `01` a `12` permanecem estáveis). Escanear com câmeras Android/iPhone e, se possível, um teste impresso.
7. Conferir direitos/autorização das letras e ilustrações; não imprimir/distribuir páginas com nomes ou dados pessoais visíveis nos desenhos.
8. Testes de regressão: seleção de áudios, playlist, upload, exclusão/ocultação, QR PDF antigo, ordenação, galeria e zoom, responsividade.

## 6. Promover para produção

1. Salve backup/exportação do banco Supabase de produção (e garanta rollback do código pela Vercel); não dependa de `git reset --hard`.
2. Aplique **a mesma migração V10** no SQL Editor do banco de produção; confirme o `to_regclass` e mantenha o restante intacto.
3. Confirme Preview **Ready**, testes completos, segurança e aprovação da Professora Lu.
4. Crie Pull Request `fix/memorias-lu-20261025-v1` → `main` no GitHub; verifique **Files changed** para confirmar apenas arquivos Memórias, package/lock, migração e documentação. Resolva conflitos sem sobrescrever outras soluções.
5. Faça merge via GitHub. Vercel Production deve ser configurada para `main` e o deploy automático deve entrar como `Ready`. Se não houver integração automática, faça Redeploy do commit aprovado em Production.
6. Abra `https://www.automacaoextrema.com/solucoes/memorias-que-encantam/livro/lu-2026` e a área Docentes; valide o fluxo completo, o PDF e três QR Codes impressos. Verifique logs sem publicar links privados.

**Observação**: o PDF exige os 12 desenhos efetivamente liberados. Fotos não publicadas não entram. A opção de letras e o novo botão de PDF estarão disponíveis apenas depois da publicação em `main` e aplicação da migração.

## 7. Reversão segura

Se falhar **antes do commit**, restaure os arquivos do backup indicado pelo instalador; para remover somente os arquivos novos da V10, use o manifesto de instalação. Não apague toda a árvore de trabalho com `git clean -fd` nem faça `reset --hard`.

Se falhar **após o deploy**, use o recurso de rollback da Vercel para o último deployment Production saudável. Mantenha a nova tabela SQL no Supabase (é aditiva e não afeta os módulos V1–V9); não exclua registros para reverter. Corrija em nova branch/PR e republique.
