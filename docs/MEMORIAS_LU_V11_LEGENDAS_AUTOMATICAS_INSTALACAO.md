# Automação Extrema — Memórias que Encantam — V11: legendas automáticas

**Origem:** ZIP de fontes fornecido em 30/10/2026; preservar o livro PDF e os QR Codes V10.  
**Worktree:** `C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias`  
**Branch de trabalho:** `fix/memorias-lu-20261025-v1`  
**Código-fonte da V11:** 2 arquivos alterados, 1 rota e 1 migração SQL novos; este guia.

## 1. O que muda

- Botão `CC Ouvir com legendas automáticas` no player. O visitante opta por usar legendas ou manter reprodução normal.
- Sem necessidade de a professora digitar ou marcar tempos. Ao ativar CC pela **primeira vez para uma gravação selecionada**, a API transcreve o áudio e recupera trechos com tempos em segundos. Nas próximas visitas, usa o cache do Supabase.
- Tela de legendas integrada e opção `Ampliar tela de legendas`, com trecho anterior, atual em destaque, próximo trecho, play/pause e barra de progresso.
- Cada legenda é associada ao `version_id` da **gravação**, não ao nome ou apenas à cantiga. Alterar a gravação escolhida aciona transcrição separada na primeira solicitação.
- Quando a docente já publicou uma letra com marcações temporais, ela continua prevalecendo. A edição V10 continua disponível, mas é opcional.
- Não modifica MP3s, PDFs impressos, QR Codes, ilustrações, autenticação e publicação da V10.

## 2. Muito importante: privacidade, permissões, custos e qualidade

As gravações contêm vozes de **crianças**. Para produzir legendas automáticas, um trecho completo de cada gravação selecionada é enviado a serviço externo de reconhecimento de fala e o resultado fica armazenado na tabela privada `ae_education_audio_captions`. A operação NÃO deve ser habilitada apenas com base na autorização anterior para publicar os áudios. Antes de habilitar, obtenha autorização específica da escola/responsáveis para **processamento por fornecedor externo**, incluindo os termos aplicáveis de proteção de dados, e para **publicar as letras reconhecidas** (direitos das canções e possíveis dados pessoais).

A aplicação exige simultaneamente 4 variáveis de ambiente server-side:

```text
OPENAI_API_KEY=... (segredo real, nunca compartilhar)
LU_AUTO_CAPTIONS_ENABLED=true
LU_AUTO_CAPTIONS_EXTERNAL_AUDIO_AUTHORIZED=true
LU_AUTO_CAPTIONS_PUBLIC_TEXT_AUTHORIZED=true
```

Sem todas configuradas exatamente assim, **nenhum áudio é enviado a terceiro por esta funcionalidade** e a interface informa que as legendas não estão habilitadas. Essas são configurações **únicas do responsável técnico**, não da docente. NUNCA colocar a chave em `NEXT_PUBLIC_*`, GitHub, scripts de coleta, prints ou mensagens.

**Tecnologia / limitação temporal:** em 30/10/2026, a API `whisper-1` fornece `verbose_json` com timestamps de segmentos; contudo a documentação oficial anuncia descontinuação em **26/02/2027**. Esta integração é uma solução de transição. Planeje migrar para alternativa de reconhecimento com timestamps antes dessa data. **Não existe garantia de sincronização perfeita** para canto coletivo, ruído ou vozes infantis. A escola deve conferir a qualidade e as permissões antes da divulgação. A transcrição gera cobrança por gravação processada, e o primeiro pedido pode demorar, consumir execução do servidor e/ou falhar por limite de duração da Vercel.

**Provedor e documentação:** https://developers.openai.com/api/docs/guides/speech-to-text

## 3. Instalar em worktree exclusivo

Faça download de `memorias-lu-v11-legendas-automaticas-implementacao.zip` em `C:\Users\lacos\Documents\zips` e de `instalar_memorias_lu_v11_legendas_automaticas.ps1` em `C:\Users\lacos\Documents\scripts`.

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias'
git fetch origin
git branch --show-current
git status --short
git pull --ff-only origin fix/memorias-lu-20261025-v1
git merge --ff-only origin/main

powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\Users\lacos\Documents\scripts\instalar_memorias_lu_v11_legendas_automaticas.ps1'
```

A branch é exigida pelo instalador. O Git deve estar limpo; preserve arquivos não rastreados fora do worktree. O instalador verifica os hashes de versão-base e dos arquivos novos, cria backup com data em `...\Documents\zips`, não faz `git commit`, não executa SQL e não publica.

## 4. Validar localmente

Usar Node 24.x (o projeto exige Node 24):

```powershell
node -v
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

**Pare em caso de erro.** É essencial que a validação seja executada no worktree completo, pois o ZIP de implementação contém somente os arquivos alterados.

## 5. Supabase — antes de usar Preview

No banco de homologação, faça backup e execute no SQL Editor:

`supabase/migrations/20261030170000_ae_education_lu_auto_captions_v11.sql`

Confira:

```sql
SELECT to_regclass('public.ae_education_audio_captions') AS tabela;
SELECT proname FROM pg_proc WHERE proname = 'ae_education_claim_auto_caption';
SELECT version_id,status,attempts,jsonb_array_length(cues) as trechos
FROM public.ae_education_audio_captions ORDER BY updated_at DESC LIMIT 15;
```

O esperado inicialmente é tabela existente e zero registros, sem impactar as mídias e letras existentes. A tabela tem RLS e nenhuma permissão direta para `anon` e `authenticated`.

## 6. GitHub: commit e push na branch correta

Com build aprovado:

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias'
git branch --show-current
git status --short
git add -- 'src/components/education/lu-music-experience.tsx' 'src/app/solucoes/memorias-que-encantam/livro/lu-2026/lu-music.css' 'src/app/solucoes/memorias-que-encantam/livro/lu-2026/api/auto-captions/route.ts' 'supabase/migrations/20261030170000_ae_education_lu_auto_captions_v11.sql' 'docs/MEMORIAS_LU_V11_LEGENDAS_AUTOMATICAS_INSTALACAO.md'
git diff --cached --check
git diff --cached --stat
git commit -m 'feat(memorias-lu): legendas automaticas por versao de audio V11'
git push -u origin fix/memorias-lu-20261025-v1
```

Se `origin/main` avançou depois da atualização da branch, integre os commits por merge (não force push) e refaça os testes antes de abrir PR.

## 7. Vercel Preview / Homologação

- Abra o Preview da branch, confirme `Ready`.
- Certifique-se de que as variáveis do Supabase de Preview apontam para **banco independente**, antes de fazer testes com escrita. Preview não implica banco de testes.
- Para validar sem encaminhar áudio infantil a terceiros, **deixe as três flags de ativação em `false`/ausentes** e confirme que o player informa "não habilitadas". Isto valida UI e bloqueio, mas não a transcrição.
- Somente após formalização da autorização para processamento/publicação, configure a chave em **Vercel Settings > Environment Variables** apenas no ambiente permitido e habilite as três flags. Faça novo Preview deploy para aplicar as variáveis.
- Abra uma cantiga autorizada, reproduza sem legenda; clique `CC Ouvir com legendas automáticas`. No primeiro acesso, a tela indica geração. Após concluir, mostra o trecho sincronizado; clique ampliar, pause, avance, retorne, feche, teste Android e iPhone.
- Desative CC: o áudio permanece funcionando sem texto.
- Reabra CC da mesma gravação: legendas prontas devem carregar do banco, sem nova chamada de transcrição.
- Troque a versão selecionada no painel docente: quando autorizada e liberada, deve utilizar outra legenda por `version_id`.
- Verifique recusa da API para UUID inventado e para gravação oculta/não selecionada (404); sem as flags, POST devolve 503 sem envio externo.
- Teste playlist, renovação de URLs assinadas, galerias, PDF de 14 páginas, QR Codes, tela docente, ordenação.
- Se a transcrição automática tiver erros, **não publique o resultado até a escola validar**. No caso de textos de terceiros sem autorização, mantenha a função desligada. É possível manter a V10 sem legendas automáticas.

## 8. Produção (após homologação e autorizações)

1. Faça backup Supabase Production. Execute a mesma migração V11 no banco real e valide a tabela e RPC. Não remova a V10.
2. Ative variáveis de produção apenas após aprovação específica. Sem isso, pode publicar a interface mas as legendas automáticas permanecerão desabilitadas.
3. GitHub: Pull Request `fix/memorias-lu-20261025-v1` -> `main`. Revise `Files changed` (apenas 5 arquivos da V11) e checks. Não merge se houver alterações não reconhecidas do TUCXA.
4. Merge via GitHub; confirme deployment Production `Ready` da `main` na Vercel e variáveis de produção. Faça teste com uma gravação permitida e depois com outra já em cache.
5. Teste o domínio oficial `https://www.automacaoextrema.com/solucoes/memorias-que-encantam/livro/lu-2026` e verifique 14 páginas do livro e seus QR Codes.
6. **Reversão:** desabilitar imediatamente `LU_AUTO_CAPTIONS_ENABLED` e fazer redeploy; se for necessário reverter interface, usar `Rollback` do deployment anterior saudável na Vercel. Manter a tabela (aditiva) e os registros para auditoria, conforme as políticas aplicáveis; não fazer `git reset --hard` nem excluir mídias.

## 9. Requisitos de operação

- A rota configura `maxDuration=60`, mas seu plano da Vercel pode impor outro limite. Transcrições lentas podem falhar e exigir nova tentativa após 10 minutos, até três vezes por versão. O primeiro acesso não oferece sincronização imediata garantida.
- Modelo `whisper-1` é temporário e tem descontinuação anunciada para fevereiro/2027: agendar atualização do fornecedor/modelo; para continuidade longa é preferível um motor mantido com suporte a tempos.
- Nenhuma palavra de criança ou letra é inventada ou pré-cadastrada no código. O servidor só transcreve a gravação **selecionada, disponível e liberada**.
