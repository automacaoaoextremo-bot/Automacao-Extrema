# AE / Reparos RMC — Histórico multimídia, 20/11/2026

## Escopo e implantação

**Branch obrigatória:** `feature/ae-atendimento-inteligente-multicliente-v1`

**Commit da coleta:** `46c96ac7ad72e6b4db39654b045cf1f7cbd850f9`

**Worktree:** `C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento`

A implementação inclui timeline de texto, áudio, imagem e vídeo por solicitação; gravação pelo navegador e mensagens do N2; importação histórica privada e idempotente; consulta restrita ao próprio cliente e operadores autorizados. Anexos iniciais legados também aparecem na timeline. Não foram executados comandos no seu GitHub, banco ou Vercel.

### Cuidados essenciais

- Homologar em projeto Supabase **separado** de produção, com contas de teste. Nunca enviar os áudios de clientes a ambientes de teste sem autorização.
- Garantir que N1/N2 estejam cadastrados e que a conta da cliente possa criar ou acompanhar seu próprio pedido.
- **Nenhuma chave service_role**, senha ou material privado no ZIP de código/GitHub.
- O bucket `ae-ai-request-media` já existe, **privado**; a migration amplia tipos e teto de arquivo sem alterar o conteúdo já armazenado.
- As URLs de leitura duram 5 minutos. Uma URL assinada vazada é utilizável até expirar; não a compartilhe.
- Data original da conversa foi inferida dos nomes dos arquivos, com fuso horário America/Sao_Paulo (-03:00). Não equivale à verificação independente dos metadados WhatsApp.
- Os áudios antigos têm conteúdo não transcrito neste pacote. Não atribuir falas a autores além dos identificadores informados nos arquivos.

## 1 — Baixar e conferir no Windows

Salve o ZIP de implementação em `C:\Users\lacos\Documents\zips` e o instalador `.ps1` em `C:\Users\lacos\Documents\scripts`.

```powershell
$Repo='C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$Scripts='C:\Users\lacos\Documents\scripts'
$Zips='C:\Users\lacos\Documents\zips'
New-Item -ItemType Directory -Force -Path $Scripts,$Zips | Out-Null
cd $Repo
git worktree list
git branch --show-current
git status -sb
git rev-parse HEAD
```

Se a branch não for a esperada, interromper. Verificar eventuais alterações locais pré-existentes; o instalador somente alterará caminhos da lista permitida. Repositório **não** deve ser limpo por `reset --hard` ou `clean -fd`.

### 2 — Simular e instalar

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
 -File "$Scripts\Instalar-AE-RMC-Historico-Multimidia-20261120.ps1" `
 -RepoRoot "$Repo" `
 -ZipPath "$Zips\AE-RMC-Historico-Multimidia-IMPLEMENTACAO-20261120.zip" `
 -BackupRoot "$Zips" -DryRun
```

Somente se concluído sem conflito, repita sem `-DryRun`. O script valida branch, manifesto, SHA256, **todos** os arquivos-base e cria backup antes de substituir. Se apontar conflitos, produzir uma nova coleta antes de prosseguir. Não usar `-Force` para ignorar hashes.

### 3 — Preparar banco de homologação

Execute primeiro a migration SQL no **Supabase homologação**:

`supabase/migrations/20261120160000_ae_rmc_timeline_multimidia.sql`

A migration cria `ae_ai_request_timeline`, restringe acesso direto e amplia as opções do bucket privado existente.

Conferir:

```sql
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id='ae-ai-request-media';

select table_name from information_schema.tables
where table_schema='public' and table_name='ae_ai_request_timeline';

select count(*) from public.ae_ai_request_timeline;
```

Não execute operações diretas no `storage.objects`: os arquivos são gerenciados pela API do Supabase Storage.

### 4 — Testes locais com Node 24

```powershell
cd $Repo
node --version  # exige 24.x
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Se qualquer comando falhar, interrompa a publicação. Ambiente: `http://localhost:3000/solucoes/atendimento-inteligente/rmc/entrar`. Configurar `.env.local` do **Supabase homologação**, não produção.

### 5 — Checklist funcional

1. Novo cliente cadastra e envia pedido com imagem, vídeo e até 5 áudios na abertura.
2. Cliente entra em **Meus pedidos > Abrir conversa e anexos**, grava e envia áudio de teste, texto e arquivo existente.
3. N2 abre o mesmo pedido em **Solicitações**, vê eventos por ordem de data, responde por texto e grava áudio.
4. N1 vê os pedidos da empresa, mas não executa a importação histórica N2.
5. Cliente A tenta consultar pedido do cliente B: recebe `403` e não recebe URL de arquivo.
6. Cliente sem sessão não consegue ler ou criar mensagens; outra empresa também recebe bloqueio.
7. O fluxo inicial de fotos/vídeos e o histórico de status seguem funcionando.
8. Links de leitura vencem após 5 minutos. Reabrir tela ou clicar Atualizar gera novos links.
9. Safari/Android: testar o microfone (exige HTTPS ou localhost); se navegador recusar, anexar `.ogg`/`.m4a` manualmente.
10. Simular upload interrompido: item incompleto não é exibido como enviado. Verificar a reconciliação no suporte.
11. Abrir arquivo OGG e vídeo em formatos realmente compatíveis com navegador; o sistema guarda arquivo original, não faz transcodificação.

### 6 — GitHub branch

Após homologação, conferir `git diff --check`, `git status -sb`, `git diff --cached --name-only`.

Atenção: **não usar `git add -A`**: a coleta tinha alterações fora do escopo, inclusive `src/app/api/atendimento-inteligente/my/requests/route.ts`.

Adicionar somente os arquivos listados no manifesto do ZIP (eles incluem a documentação e migration), revisar staging e executar:

```powershell
git commit -m "feat(ae): historico multimidia RMC e importacao cronologica"
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

Antes do commit, é obrigatório o `git add` seletivo dos arquivos. Verificar `git diff --cached`.

### 7 — Vercel Preview

O Preview deve usar Node 24 e Supabase homologação; envio de mensagens reais por WhatsApp desativado. Aplicar SQL no banco de homologação antes de abrir o Preview. Validar login N1/N2, cliente, upload, playback, isolamento e paginação.

### 8 — Produção

- Backup/snapshot lógico do banco e avaliação dos arquivos já existentes no bucket.
- Aplicar SQL de expansão no Supabase produção **antes** do deploy, pois é aditivo.
- Conferir `git fetch origin --prune; git log --oneline origin/main..HEAD; git diff --stat origin/main...HEAD`. Pode haver commits acumulados de outros ajustes.
- Abrir PR de `feature/ae-atendimento-inteligente-multicliente-v1` para `main` e homologar o escopo completo; depois realizar merge. Verificar deployment Production no Vercel.
- Fazer smoke tests no ambiente real com um pedido autorizado, sem enviar dados privados em testes públicos.
- Se ocorrer erro, reverter aplicação por deployment anterior; não excluir tabela/arquivos sem analisar dados novos. SQL aditivo pode permanecer enquanto corrige o código.

### 9 — Registro da solicitação da mãe do Márcio: após atualizar

1. Copiar `Registrar-Pedido-Mae-RMC-CORRIGIDO.ps1` e `Pedido-Mae-RMC-Modelo.json` para a pasta scripts. O JSON precisa de nome, celular, endereço real e autorização.
2. Corrigir dados no JSON. Usar PowerShell com `-DadosJson` e **sem** `-Executar` para simulação offline. Esse modo só valida sintaxe/dados e não cria pedido.
3. Registrar com `-Executar` e, se autorizado e necessário, `-CriarClienteSeNecessario`. Não use `-FotoPath` nessa execução se a foto será importada depois com a data histórica, para evitar duplicação.
4. Guardar o **UUID do pedido** retornado. O status inicial será `pending`, como requer a API.
5. Descompactar o ZIP privado de mídia em `C:\Users\lacos\Documents\zips\rmc-mae-midias`, sem subpastas, e copiar `Historico-Mae-RMC-Manifesto-Privado.json` para scripts.
6. Rodar `Importar-Historico-Mae-RMC.ps1 -RequestId <UUID>` sem `-Executar` para verificar os 8 hashes.
7. Somente com N2 autenticado e dados conferidos, rodar com `-Executar -MarcarParaOrcamento` apontando para o ambiente correto (Preview ou Production, com a anon key correspondente). N2 enviará 8 anexos na ordem do manifesto e alterará status para `in_review` depois da importação.
8. Na tela de Anderson, confirmar que **22/09, 23/09 e 20/10 de 2026** aparecem antes da data de criação do pedido, identificados como importados.
9. Conferir cada áudio/reprodução e autor indicados; nenhum áudio deve ser transcrito sem processamento separado.

```powershell
# Exemplo de simulacao do registro
powershell.exe -NoProfile -ExecutionPolicy Bypass `
 -File "$Scripts\Registrar-Pedido-Mae-RMC-CORRIGIDO.ps1" `
 -RepoRoot "$Repo" -DadosJson "$Scripts\Pedido-Mae-RMC-Modelo.json"

# Exemplo de simulacao da importacao (sem rede, sem gravar)
powershell.exe -NoProfile -ExecutionPolicy Bypass `
 -File "$Scripts\Importar-Historico-Mae-RMC.ps1" `
 -RequestId 'COLE-AQUI-O-UUID-REAL' `
 -MidiasDir "$Zips\rmc-mae-midias" `
 -Manifesto "$Scripts\Historico-Mae-RMC-Manifesto-Privado.json"
```

**Nota:** o `COLE-AQUI-O-UUID-REAL` é apenas marcador e será rejeitado. Não use o mesmo token de Auth de um ambiente com a API de outro.

**Avisos técnicos:** a importação dos áudios não depende do status N2 ser in_review antes dos uploads. O importador preserva a data histórica em `occurred_at` e guarda data real de inserção em `created_at`. A API permite até 80 anexos novos por pedido. Arquivos incompletos não são exibidos; limpeza automática de pendências e transcrição opcional poderão ser evoluídas depois.
