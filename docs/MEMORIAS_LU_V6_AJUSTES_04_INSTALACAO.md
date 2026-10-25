# Automação Extrema — Memórias que Encantam — V6 / Ajustes 04

Base recebida: `memorias-lu-ajustes-04-fontes-20261025-111843.zip`.
Branch de desenvolvimento: `feature/memorias-que-encantam-lu-piloto-v1`.

## Alterações

1. Botão no cabeçalho: **Docentes** / **CLIQUE PARA ACESSAR**.
2. A página pública busca somente as gravações escolhidas e permitidas pelo servidor. A pessoa autenticada como docente pode ouvir a versão escolhida em modo de conferência antes da liberação às famílias. Usuários comuns não podem ouvir vozes não liberadas.
3. Pop-ups principais exibem **FECHAR**.
4. O painel de ordem não mostra explicações técnicas sobre identificadores.
5. Curadoria permite **Excluir áudio** de versões não selecionadas. É uma remoção permanente do arquivo privado e de seu registro; exige confirmação explícita. Para excluir uma versão escolhida, primeiro selecione outra.
6. Botão **Ajuda para gravar e enviar áudios**, com instruções para Android/iPhone e upload pelo navegador.
7. QR Codes em PDF vetorial A4, um código por página, incluindo título; seletor geral, individual ou todas as 12 músicas em sequência persistida. A prévia aparece antes de salvar. O gerador PDF exige autenticação docente.
8. Mensagens de erro mais claras quando links privados não são gerados ou áudios não podem ser reproduzidos no celular.

## Segurança e conteúdo real

Esta V6 NÃO libera automaticamente a publicação de vozes infantis. Ela conserva os controles `media_authorized` e `family_released` da tabela `ae_education_projects`.

A rota pública chama `/api?view=public`, que entrega somente versões escolhidas e disponíveis, quando `family_released=true` ou quando a sessão é de docente autorizado. Sessões de docentes exibem prévia de conferência sem dar acesso às famílias.

Para revisar no SQL Editor (somente leitura):

```sql
SELECT slug, media_authorized, family_released
FROM public.ae_education_projects
WHERE slug = 'lu-2026';

SELECT track_id, source_type, original_filename, status, is_selected
FROM public.ae_education_audio_versions
WHERE project_slug = 'lu-2026'
ORDER BY track_id, created_at;

SELECT COUNT(DISTINCT track_id) AS musicas_selecionadas
FROM public.ae_education_audio_versions
WHERE project_slug = 'lu-2026'
  AND status = 'available' AND is_selected = true;
```

Se a escola autorizar ESPECIFICAMENTE a disponibilização das vozes na internet e todas as 12 músicas estiverem selecionadas e disponíveis, um administrador poderá executar manualmente (não automatizado pelo pacote):

```sql
UPDATE public.ae_education_projects
SET family_released = true
WHERE slug = 'lu-2026'
  AND media_authorized = true
  AND (SELECT COUNT(DISTINCT track_id)
       FROM public.ae_education_audio_versions
       WHERE project_slug = 'lu-2026'
         AND status = 'available' AND is_selected = true) = 12;
```

Uma autorização apenas para armazenamento, se não cobrir a divulgação, NÃO é suficiente para executar essa alteração. Para suspender novos acessos às gravações, `SET family_released = false` (URLs assinadas antigas podem sobreviver até expirar, tipicamente 300 segundos).

Gravações com duração 0:00/0:00 podem indicar incompatibilidade do navegador com o contêiner/codificação, link expirado ou falha de upload. Confira o arquivo original e, se preciso, gere versão M4A/AAC compatível (mantendo o original privado). O código não converte os arquivos automaticamente.

## Instalação

Salvar o ZIP em `C:\Users\lacos\Documents\zips` e o instalador `.ps1` em `C:\Users\lacos\Documents\scripts`. Executar no worktree limpo da branch, em PowerShell:

```powershell
cd "C:\Users\lacos\Documents\Github\automacao-extrema-memorias"
git branch --show-current
git status
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "C:\Users\lacos\Documents\scripts\instalar_memorias_lu_v6_ajustes_04.ps1"
```

## Testes obrigatórios

```powershell
npx eslint src/lib/education src/components/education src/app/solucoes/memorias-que-encantam
npx tsc --noEmit
npm run build
```

Testar em Android e iPhone, especialmente quando a página estiver aberta há mais de 5 minutos. Se houver erro de reprodução, recarregar para renovar URL temporária e verificar o formato do arquivo.

## GitHub

```powershell
git add "src/components/education/lu-header.tsx"
git add "src/components/education/lu-curation.tsx"
git add "src/components/education/lu-music-experience.tsx"
git add "src/app/solucoes/memorias-que-encantam/livro/lu-2026/lu-music.css"
git add "src/app/solucoes/memorias-que-encantam/livro/lu-2026/api/route.ts"
git add "src/app/solucoes/memorias-que-encantam/livro/lu-2026/api/delete/route.ts"
git add "src/app/solucoes/memorias-que-encantam/livro/lu-2026/api/qr/pdf/route.ts"
git add "src/lib/education/lu-qr-pdf.ts"
git add "docs/MEMORIAS_LU_V6_AJUSTES_04_INSTALACAO.md"
git diff --cached --stat
git diff --cached --check
git commit -m "feat(educacao): ajustes 04 curadoria audio e QR PDF Lu V6"
git push -u origin feature/memorias-que-encantam-lu-piloto-v1
```

## Vercel

O push deve gerar uma Preview da branch (se integração GitHub ativada). Após ficar `Ready`, validar interface, controle de acesso, exclusão, ajuda, geração de PDFs e prévia do docente.

O PDF aponta para `https://www.automacaoextrema.com/solucoes/memorias-que-encantam/livro/lu-2026`, portanto o teste real do QR deve ser repetido depois do merge seguro para `main` e do deployment em Production.

Nenhuma migração SQL nova, chave de ambiente nova ou alteração nos outros projetos é necessária especificamente para esta V6.
