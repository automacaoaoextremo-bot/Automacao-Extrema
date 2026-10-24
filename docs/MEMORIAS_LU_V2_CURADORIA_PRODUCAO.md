# Memórias que Encantam — piloto Lu V2

## Finalidade
- Módulo independente do Bingo e da Organização em Harmonia.
- Acesso familiar com código; curadoria com código ADMIN diferente.
- 12 músicas, até 24 gravações iniciais, novas gravações enviadas pelas professoras.
- Uploads em Supabase Storage **privado**; QR do livro não contém código secreto.
- **A seleção de uma versão nunca libera automaticamente as vozes para as famílias.**

## Endereços previstos em produção (após o merge)
- Leitor: `https://www.automacaoextrema.com/solucoes/memorias-que-encantam/livro/lu-2026`
- Curadoria: `https://www.automacaoextrema.com/solucoes/memorias-que-encantam/livro/lu-2026/admin`

## Verificações de segurança prévias
1. Confirmar por escrito que a escola é autorizadora do uso, da guarda e do compartilhamento das vozes, incluindo regras aplicáveis a responsáveis e às composições.
2. Antes de **qualquer upload** com vozes infantis, executar no Supabase apenas após autorização:
   `update public.ae_education_projects set media_authorized=true where slug='lu-2026';`
3. Manter `family_released=false` até TODAS as versões finais, ilustrações, letras e permissões estarem homologadas.
4. Códigos diferentes para leitura e curadoria; não incluir em URL, QR, GitHub ou capturas.
5. Dar preferência a convites por responsável para a distribuição final; um código coletivo é controle fraco que pode ser compartilhado.
6. Testar leitura de áudio em outra sessão sem os cookies: sem acesso, sem arquivo.

## Supabase — execução manual, sem mexer nas outras soluções
1. Faça backup e confirme que está no projeto correto do Supabase.
2. Abra **SQL Editor** e revise `supabase/migrations/20261024133000_ae_education_lu_audio_pilot.sql`.
3. Execute a migração. Ela cria apenas `ae_education_projects`, `ae_education_audio_versions`, três funções e bucket `education-media-private`.
4. Em **Storage** confirme `education-media-private` com Public **OFF**.
5. Em **Table Editor** confirme o projeto `lu-2026`, `media_authorized=false`, `family_released=false`.
6. O banco compartilhado **não deve** ser preparado via `supabase db push` sem revisão do histórico de migrações existentes.

## Importar as duas origens — sem publicar vozes
Na pasta `automacao-extrema-memorias`, com Python 3:

```powershell
python scripts/educacao/importar_audios_lu.py --zip "C:\Users\lacos\Documents\zips\Lu(1).zip" --env ".env.local"
```

Isso imprime o pareamento das 12 músicas **sem enviar dados**. Consulte a Lu sobre títulos não idênticos (Cowboy João/João Feijão, Pato Pateta/Lá Vem o Pato, Ratinho e o Relógio/Tique-Tique Titá).

**Somente após autorização e o projeto marcado `media_authorized=true`:**

```powershell
python scripts/educacao/importar_audios_lu.py --zip "C:\Users\lacos\Documents\zips\Lu(1).zip" --env ".env.local" --executar --autorizacao-confirmada
```

Não colocar ZIPs com vozes em `public/`, `git add` ou nos Deployments.

## Vercel — variáveis
Preview e Production na mesma aplicação, em escopos separados:
- `MEMORIAS_LU_ACCESS_CODE` código leitura (aleatório; ao menos 8, preferencialmente 12+)
- `MEMORIAS_LU_ADMIN_CODE` código curadoria (diferente, aleatório; ao menos 12, preferencialmente 20+)
- `MEMORIAS_LU_SESSION_SECRET` segredo aleatório (mínimo 32 caracteres, não enviar à Lu)
- As atuais `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` precisam estar presentes, sem copiar segredo para `NEXT_PUBLIC_`.

Observação: a V1 aceita a antiga `MEMORIAS_LU_PREVIEW_CODE`; a V2 aceita essa variável como fallback, mas o ideal é configurar `MEMORIAS_LU_ACCESS_CODE`.

Após salvar as variáveis, **redeploy**. A rota em Production usa o domínio `www.automacaoextrema.com` e não precisa de login Vercel quando Standard Deployment Protection protege só os Previews.

## Curadoria
- A Lu abre `/admin`, entra com código próprio e compara versões do gravador e WhatsApp.
- Ações: escolher (seleção única), ocultar (sem exclusão física), restaurar e upload (até 25 MB via link de upload assinado).
- Bucket é privado. A API só emite URL temporária após conferir o cookie.
- A Lu valida títulos, ordem, som, desenho e letra. **Nenhuma alteração publica automaticamente as vozes.**

## Habilitar famílias — somente no final
Após autorização documental, duas versões revisadas, uma selecionada para cada música, letras/desenhos homologados:

```sql
-- Conferir 12 músicas selecionadas ANTES:
select track_id, count(*) as escolhidas
from public.ae_education_audio_versions
where project_slug='lu-2026' and is_selected and status='available'
group by track_id order by track_id;
-- Depois de confirmar todas as autorizações por escrito:
update public.ae_education_projects
set family_released=true
where slug='lu-2026' and media_authorized=true;
```

Quando `family_released=false`, visitantes do livro ouvem apenas demonstrações instrumentais.

## QR
`QR_Livro_Lu_Homologacao.png` é um **QR provisório** para a futura rota de produção. Ele só funcionará após o merge em `main` e o deploy no domínio indicado. Não usar como QR definitivo do livro antes da validação da Lu.

## Git — proteger os projetos atuais
Use o worktree `C:\Users\lacos\Documents\Github\automacao-extrema-memorias` na branch `feature/memorias-que-encantam-lu-piloto-v1`. Não faça commits dentro da pasta antiga cheia de alterações de Bingo.

Depois de aplicar o ZIP de update e verificar build:

```powershell
git status --short
git add src/app/solucoes/memorias-que-encantam src/components/education src/lib/education scripts/educacao supabase/migrations/20261024133000_ae_education_lu_audio_pilot.sql docs/MEMORIAS_LU_V2_CURADORIA_PRODUCAO.md
git diff --cached --stat
git commit -m "feat(educacao): curadoria segura de audios do livro da Lu"
git push -u origin feature/memorias-que-encantam-lu-piloto-v1
```

Acompanhe o Preview; **não faça merge automático antes de testar as APIs e a segurança**. Após revisão, abra um PR no GitHub: `feature/memorias-que-encantam-lu-piloto-v1` → `main`, com arquivos apenas dessa solução. Verifique checks, diff e conflitos e faça merge via GitHub. Isso disparará Production se `main` for a Production Branch do projeto Vercel.

## Testes mínimos
- Preview: `tsc`, `eslint`, `build`; checar variáveis e SQL.
- `/admin` com código inválido não entra; código leitura não entra na curadoria.
- `GET /api`, `/api/action`, `/api/upload-token` negam acesso sem cookie (401).
- Com mídia não autorizada, endpoint de upload retorna 403.
- Upload com mídia autorizada: 2 versões por música, play em Android Chrome/iOS Safari, escolha e ocultação.
- Sem `family_released`, leitor mostra áudio de demonstração, não assinado da criança.
- Testar link e QR em janela anônima de outro celular, sem login Vercel.
- Após produção confirmar funcionamento do leitor e curadoria no domínio final, somente então entregar o QR provisório.

## Limitações deliberadas do piloto
- Senhas compartilhadas são suficientes apenas para validação restrita, não são identidade individual. Antes do uso em escala, avaliar login/convite por responsável e controles de revogação.
- A V2 não gera relatórios individuais de acesso, não transforma áudio, não transcreve letras nem apaga permanentemente gravações.
- Upload assinado permite até 25 MB por arquivo, com controles básicos de tipo; aperfeiçoar validação real do conteúdo e rate limiting antes de abrir para várias escolas.
- O exemplo de cabeçalho usa ícone de livro enquanto não existe aprovação da escola para utilizar nome/logomarca oficial.
