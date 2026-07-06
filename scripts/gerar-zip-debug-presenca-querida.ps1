<#
.SYNOPSIS
  Gera um ZIP com os arquivos necessários para diagnosticar/corrigir erro 500 no formulário
  Quero Conhecer da solução Presença Querida.

.USAGE
  powershell -ExecutionPolicy Bypass -File .\gerar-zip-debug-presenca-querida.ps1 -RepoRoot . -OutDir .

.NOTES
  - Não inclui node_modules, .next, .git, .vercel, dist, build, coverage.
  - Não inclui .env real por segurança; inclui .env.example se existir.
  - Foi escrito sem TrimStart com barra invertida para evitar erro no Windows PowerShell.
#>

param(
  [string]$RepoRoot = ".",
  [string]$OutDir = ".",
  [switch]$IncludeAllPresencaQuerida
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[AE] $Message" -ForegroundColor Cyan
}

function Resolve-FullPath {
  param([string]$PathValue)
  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $PathValue))
}

function Normalize-RelativePath {
  param([string]$PathValue)
  if ([string]::IsNullOrWhiteSpace($PathValue)) { return "" }
  $normalized = $PathValue.Trim() -replace '^[\\/]+', ''
  return $normalized
}

function Should-SkipPath {
  param([string]$FullName)

  $parts = $FullName -split '[\\/]'
  $blockedDirs = @(
    'node_modules',
    '.next',
    '.git',
    '.vercel',
    'dist',
    'build',
    'coverage',
    '.turbo',
    '.cache'
  )

  foreach ($part in $parts) {
    if ($blockedDirs -contains $part) { return $true }
  }

  $fileName = [System.IO.Path]::GetFileName($FullName)
  if ($fileName -eq '.env') { return $true }
  if ($fileName -like '.env.*' -and $fileName -ne '.env.example') { return $true }

  return $false
}

function Copy-FilePreservingPath {
  param(
    [string]$SourceRoot,
    [string]$DestinationRoot,
    [string]$RelativePath
  )

  $rel = Normalize-RelativePath $RelativePath
  if ([string]::IsNullOrWhiteSpace($rel)) { return }

  $source = Join-Path $SourceRoot $rel
  if (-not (Test-Path $source)) {
    Write-Host "[AE] Aviso: não encontrado, ignorado: $rel" -ForegroundColor Yellow
    return
  }

  $item = Get-Item $source
  if ($item.PSIsContainer) {
    Get-ChildItem -Path $item.FullName -Recurse -File | ForEach-Object {
      if (Should-SkipPath $_.FullName) { return }

      $sourceFull = $_.FullName
      $sourceRootClean = $SourceRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
      $relativeFromRoot = $sourceFull.Substring($sourceRootClean.Length) -replace '^[\\/]+', ''
      $dest = Join-Path $DestinationRoot $relativeFromRoot
      $destDir = Split-Path $dest -Parent
      if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
      Copy-Item -Path $sourceFull -Destination $dest -Force
    }
  } else {
    if (Should-SkipPath $item.FullName) { return }
    $dest = Join-Path $DestinationRoot $rel
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
    Copy-Item -Path $item.FullName -Destination $dest -Force
  }
}

$repo = Resolve-FullPath $RepoRoot
$out = Resolve-FullPath $OutDir

if (-not (Test-Path $repo)) { throw "RepoRoot não encontrado: $repo" }
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Force -Path $out | Out-Null }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) "ae-presenca-querida-debug-$timestamp"
$zipPath = Join-Path $out "ae-presenca-querida-debug-formulario-$timestamp.zip"

Write-Step "Preparando pasta temporária..."
if (Test-Path $tempRoot) { Remove-Item -Recurse -Force $tempRoot }
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

$paths = @(
  # Arquivos de projeto e configuração
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'tsconfig.json',
  'eslint.config.js',
  'eslint.config.mjs',
  '.eslintrc.json',
  '.env.example',

  # Formulário e páginas da solução
  'src/app/solucoes/presenca-querida/page.tsx',
  'src/app/solucoes/presenca-querida/quero-conhecer/page.tsx',
  'src/app/solucoes/presenca-querida/obrigado/page.tsx',
  'src/app/solucoes/presenca-querida/login/page.tsx',
  'src/app/solucoes/presenca-querida/cliente/page.tsx',
  'src/app/solucoes/presenca-querida/confirmar/[token]/page.tsx',

  # APIs diretamente envolvidas no erro 500 e no fluxo de lead/acesso
  'src/app/api/presenca-querida/leads/route.ts',
  'src/app/api/presenca-querida/leads/lookup/route.ts',
  'src/app/api/presenca-querida/cliente/dashboard/route.ts',
  'src/app/api/presenca-querida/cliente/onboarding/route.ts',
  'src/app/api/presenca-querida/confirmar/[token]/route.ts',

  # Bibliotecas compartilhadas que geralmente participam do erro 500
  'src/lib/supabase.ts',
  'src/lib/supabase-admin.ts',
  'src/lib/supabaseServer.ts',
  'src/lib/email.ts',
  'src/lib/mailer.ts',
  'src/lib/botconversa.ts',
  'src/lib/whatsapp.ts',
  'src/lib/ae-access.ts',
  'src/lib/ae-leads.ts',
  'src/lib/ae-solutions.ts',

  # Tipos/configs compartilhados, se existirem
  'src/types',
  'src/config',
  'src/components',

  # SQL da solução e estrutura administrativa relacionada
  'supabase/sql/20260620_07_presenca_querida_cliente_fundador.sql',
  'supabase/sql',

  # Referência do Corrente em Dia para comparar o comportamento correto
  'src/app/api/corrente-em-dia/leads/route.ts',
  'src/app/api/corrente-em-dia/leads/lookup/route.ts',
  'src/app/solucoes/corrente-em-dia/quero-conhecer/page.tsx'
)

if ($IncludeAllPresencaQuerida) {
  $paths += @(
    'src/app/solucoes/presenca-querida',
    'src/app/api/presenca-querida'
  )
}

Write-Step "Copiando arquivos necessários para diagnosticar o erro do formulário..."
foreach ($path in ($paths | Select-Object -Unique)) {
  Copy-FilePreservingPath -SourceRoot $repo -DestinationRoot $tempRoot -RelativePath $path
}

Write-Step "Gerando relatório de contexto..."
$reportPath = Join-Path $tempRoot 'INSTRUCOES_DEBUG_PRESENCA_QUERIDA.md'
@"
# Debug Presença Querida — erro no formulário Quero Conhecer

Erro observado:

- Tela: /solucoes/presenca-querida/quero-conhecer
- Endpoint: /api/presenca-querida/leads
- Sintoma no navegador: HTTP 500 + Unexpected end of JSON input

Importante incluir junto, se possível:

1. Print ou texto do erro em Vercel > Project > Deployments > Functions/Logs ao enviar o formulário.
2. Resultado do SQL abaixo no Supabase, se houver dúvida de estrutura:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and (table_name like 'pq_%' or table_name in ('ae_solutions', 'ae_clients'))
order by table_name;
```

3. Conferir na Vercel se existem as variáveis:

- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- EMAIL_NOTIFICATIONS_ENABLED
- SMTP_HOST / SMTP_USER / SMTP_PASS, se e-mail estiver ativo
- BOTCONVERSA_ENABLED, se integração estiver ativa

Este ZIP não inclui .env real por segurança.
"@ | Set-Content -Path $reportPath -Encoding UTF8

Write-Step "Compactando..."
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $tempRoot '*') -DestinationPath $zipPath -Force

Write-Step "ZIP gerado com sucesso:"
Write-Host $zipPath -ForegroundColor Green

Write-Step "Limpando pasta temporária..."
Remove-Item -Recurse -Force $tempRoot

Write-Step "Concluído. Anexe este ZIP no chat."
