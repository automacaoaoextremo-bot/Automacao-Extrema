# Automação Extrema — Memórias que Encantam — Ajustes 02 (V4)

## Escopo

- Compactação da página inicial para uso no celular; retirada do quadro de sugestões e do rodapé promocional.
- Área dos docentes simplificada. Exibe nome do docente autenticado na barra superior.
- Ordenação persistente das 12 músicas em `ae_education_track_order`.
- QR geral e individual por música no painel docente: identidade baseada em `track_id`, jamais na posição.
- API pública mantém somente uma versão selecionada e liberada por canção.
- Nenhum áudio, imagem real ou credencial faz parte do pacote.

## Antes de instalar

1. Trabalhe no worktree `C:\Users\lacos\Documents\Github\automacao-extrema-memorias` e confirme a branch `feature/memorias-que-encantam-lu-piloto-v1`.
2. É obrigatório que `git status --short` esteja vazio. O instalador recusa alterações pendentes.
3. Faça backup e confirme o projeto Supabase correto.
4. O pacote foi validado com TypeScript e ESLint; faça `npm run build` no seu Windows com Node 24.

## Aplicação do pacote

Salve o ZIP na pasta `C:\Users\lacos\Documents\zips`, instale com o `.ps1` e confira `git diff`.

## Migração incremental

**Depois das migrações V2 e V3** execute no Supabase SQL Editor:

`supabase/migrations/20261024224500_ae_education_lu_track_order_v4.sql`

A migração é idempotente e não altera tabelas das outras soluções. Ela preenche as músicas de 01 a 12 apenas se ainda não houver registro.

Consulta de verificação:

```sql
SELECT track_id, sort_order
FROM public.ae_education_track_order
WHERE project_slug = 'lu-2026'
ORDER BY sort_order;
```

Devem aparecer 12 linhas, com valores de 1 a 12.

## Acesso adicional à área dos docentes

Use o gerador local **já existente**, sem enviar telefone, senha ou SQL gerado ao GitHub:

```powershell
python scripts/educacao/gerar_sql_acesso_professora.py `
  --telefone "19992360856" `
  --nome "Márcio Alexandre" `
  --saida "C:\Users\lacos\Documents\scripts\cadastro-docente-validacao-local.sql"
```

O script solicitará uma senha temporária no terminal. Execute o arquivo SQL produzido no Supabase SQL Editor do projeto correto, confirme o registro e remova o SQL local. A senha deverá ser trocada no primeiro login. Não use a mesma senha de outras soluções.

## Aprovação das 24 gravações

As versões importadas com sucesso estão em `status='available'`, independentemente de serem selecionadas. O fato de existirem duas opções disponíveis para a docente **não significa que ambas serão publicadas**. O sistema permite exatamente uma versão `is_selected=true` por música.

```sql
SELECT track_id, source_type, status, is_selected, original_filename
FROM public.ae_education_audio_versions
WHERE project_slug = 'lu-2026'
ORDER BY track_id, source_type, created_at;
```

Se alguma gravação estiver `pending`, confirme o upload; não a marque como disponível sem verificar o objeto no Storage. Se estiver `hidden`, use Restaurar na curadoria. O botão **Escolher esta** define a versão final para cada canção. A variável `family_released` continua como controle da publicação; não a altere sem aprovação formal para divulgação pela internet.

## QR Codes: independentes da ordem

- Livro inteiro: `https://www.automacaoextrema.com/solucoes/memorias-que-encantam/livro/lu-2026`
- Exemplo música 02: `https://www.automacaoextrema.com/solucoes/memorias-que-encantam/livro/lu-2026?musica=02`

Alterar a ordem de exibição não muda `track_id`. O QR Code usa o domínio permanente, mesmo quando gerado durante Preview. **Não teste esse QR antes de atualizar Production**; o código apontará para a versão que estiver publicada no domínio principal.

## Homologação

1. Abrir página inicial pelo celular e confirmar a compactação e ausência da caixa de sugestões.
2. Entrar no painel de docentes e conferir “Área dos docentes”.
3. Login como Márcio e verificar o nome no cabeçalho.
4. Definir uma nova ordem, salvar, recarregar e conferir persistência.
5. Conferir que o QR da música 02 abre a mesma canção, mesmo depois da mudança de posição.
6. Verificar as duas gravações disponíveis por música; escolher uma sem apagar a outra.
7. Conferir que APIs de upload, ordem e seleção retornam 401 para visitante não autenticado.
8. Testar browsers Android/iPhone e produção somente depois de Preview validado.

## Git e Vercel

```powershell
cd "C:\Users\lacos\Documents\Github\automacao-extrema-memorias"
git branch --show-current
git status --short
npx eslint src/lib/education src/components/education src/app/solucoes/memorias-que-encantam
npx tsc --noEmit
npm run build
git add src/app/solucoes/memorias-que-encantam src/components/education src/lib/education/lu-track-order.ts supabase/migrations/20261024224500_ae_education_lu_track_order_v4.sql docs/MEMORIAS_LU_V4_AJUSTES_02_INSTALACAO.md
git diff --cached --stat
git diff --cached --check
git commit -m "feat(educacao): ajustes 02 mobile docentes ordem e QR Codes da Lu"
git push -u origin feature/memorias-que-encantam-lu-piloto-v1
```

Depois do push, verifique o deployment **Preview** vinculado à branch. Para Production: abra Pull Request `feature/memorias-que-encantam-lu-piloto-v1` → `main`, revise o diff e os testes antes do merge. Confirme as variáveis do Supabase e `MEMORIAS_LU_SESSION_SECRET` em Production. O build local é obrigatório antes do push.
