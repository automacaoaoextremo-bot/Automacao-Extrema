param(
  [string]$RepoRoot = ".",
  [string]$OutDir = "."
)

$ErrorActionPreference = "Stop"

function Write-AE($Message) { Write-Host "[AE] $Message" }

function Resolve-FullPath([string]$PathValue) {
  $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($PathValue)
}

function Should-SkipPath {
  param([string]$FullName)

  $normalized = $FullName -replace '\\', '/'
  foreach ($fragment in @('/node_modules/','/.next/','/.git/','/.vercel/','/dist/','/build/','/coverage/','/.turbo/','/tmp/','/.cache/')) {
    if ($normalized.Contains($fragment)) { return $true }
  }

  $fileName = [System.IO.Path]::GetFileName($FullName)
  if ($fileName -match '^\.env$') { return $true }
  if ($fileName -match '^\.env\.local$') { return $true }
  if ($fileName -match '^\.env\.production$') { return $true }
  if ($fileName -match '^\.env\.development$') { return $true }

  return $false
}

function Copy-DirectoryFiltered {
  param([string]$SourceDir, [string]$TargetDir)

  if (-not (Test-Path -LiteralPath $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
  }

  $sourceRootResolved = Resolve-FullPath $SourceDir

  Get-ChildItem -LiteralPath $SourceDir -Recurse -Force | ForEach-Object {
    if (Should-SkipPath $_.FullName) { return }

    $subPath = $_.FullName.Substring($sourceRootResolved.Length) -replace '^[\\/]+', ''
    $dest = Join-Path $TargetDir $subPath

    if ($_.PSIsContainer) {
      if (-not (Test-Path -LiteralPath $dest)) {
        New-Item -ItemType Directory -Path $dest -Force | Out-Null
      }
    } else {
      $destParent = Split-Path -Parent $dest
      if ($destParent -and -not (Test-Path -LiteralPath $destParent)) {
        New-Item -ItemType Directory -Path $destParent -Force | Out-Null
      }
      Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
    }
  }
}

function Copy-ItemSafe {
  param([string]$RelativePath, [string]$SourceRoot, [string]$TargetRoot)

  $cleanRelative = ($RelativePath.Trim() -replace '^[\\/]+', '')
  $source = Join-Path $SourceRoot $cleanRelative
  $target = Join-Path $TargetRoot $cleanRelative

  if (-not (Test-Path -LiteralPath $source)) {
    Write-AE "Aviso: não encontrado, ignorando: $cleanRelative"
    return
  }

  $targetParent = Split-Path -Parent $target
  if ($targetParent -and -not (Test-Path -LiteralPath $targetParent)) {
    New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
  }

  if ((Get-Item -LiteralPath $source).PSIsContainer) {
    Copy-DirectoryFiltered -SourceDir $source -TargetDir $target
  } else {
    Copy-Item -LiteralPath $source -Destination $target -Force
  }
}

function New-ZipRobust {
  param([string]$SourceDir, [string]$ZipPath)

  if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
  }

  $sourceFull = Resolve-FullPath $SourceDir
  $zipParent = Resolve-FullPath (Split-Path -Parent $ZipPath)
  $zipFull = Join-Path $zipParent ([System.IO.Path]::GetFileName($ZipPath))

  Write-AE "Tentando compactar com .NET ZipFile..."
  try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($sourceFull, $zipFull)
  } catch {
    Write-AE "Falha no .NET ZipFile: $($_.Exception.Message)"
  }

  if (Test-Path -LiteralPath $zipFull) { return $zipFull }

  Write-AE "Tentando compactar com tar.exe..."
  try {
    $parent = Split-Path -Parent $sourceFull
    $leaf = Split-Path -Leaf $sourceFull
    Push-Location $parent
    tar.exe -a -cf $zipFull $leaf
    Pop-Location
  } catch {
    try { Pop-Location } catch {}
    Write-AE "Falha no tar.exe: $($_.Exception.Message)"
  }

  if (Test-Path -LiteralPath $zipFull) { return $zipFull }

  Write-AE "Tentando compactar com Compress-Archive..."
  try {
    Compress-Archive -Path (Join-Path $sourceFull "*") -DestinationPath $zipFull -Force
  } catch {
    Write-AE "Falha no Compress-Archive: $($_.Exception.Message)"
  }

  if (Test-Path -LiteralPath $zipFull) { return $zipFull }

  throw "Não foi possível gerar o ZIP em: $zipFull"
}

$repo = Resolve-FullPath $RepoRoot
$out = Resolve-FullPath $OutDir

if (-not (Test-Path -LiteralPath $repo)) { throw "RepoRoot não encontrado: $repo" }
if (-not (Test-Path -LiteralPath $out)) { New-Item -ItemType Directory -Path $out -Force | Out-Null }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "ae-presenca-querida-ajustes-confirmacoes-publico-header-fixo-$timestamp"
$tempRoot = Join-Path $env:TEMP $packageName

if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

Write-AE "Preparando pacote em: $tempRoot"
Write-AE "Copiando arquivos necessários para manter fixo o cabeçalho completo do link público de confirmações..."

$paths = @(
  # Configuração mínima para validar lint/build
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
  "tsconfig.json",
  "eslint.config.mjs",
  "eslint.config.js",
  "postcss.config.mjs",
  "postcss.config.js",
  ".env.example",
  "README.md",

  # Principal: link público das confirmações
  "src/app/solucoes/presenca-querida/confirmacoes/[token]/page.tsx",

  # Cabeçalho compartilhado que foi ajustado na rodada anterior
  "src/components/ae-solution-header.tsx",

  # Estilos/layout que podem precisar de sticky/top/padding para o header fixo
  "src/app/globals.css",
  "src/app/layout.tsx",

  # Página pública de aprovações, para preservar padrão caso o componente seja compartilhado
  "src/app/solucoes/presenca-querida/acompanhamento/[token]/page.tsx",

  # Área logada de confirmações, somente para manter botão/link e referência visual
  "src/app/solucoes/presenca-querida/cliente/confirmacoes/page.tsx",

  # APIs que alimentam a página pública
  "src/app/api/presenca-querida/cliente/confirmations/route.ts",
  "src/app/api/presenca-querida/public/confirmations/[token]/route.ts",

  # Libs usadas pela página pública
  "src/lib/presenca-daniela50.ts",
  "src/lib/presenca-querida.ts",
  "src/lib/presenca-auth.ts",
  "src/lib/supabase-admin.ts",

  # Assets e SQLs de referência
  "public/presenca-querida",
  "supabase/sql"
)

foreach ($path in $paths) { Copy-ItemSafe -RelativePath $path -SourceRoot $repo -TargetRoot $tempRoot }

$manifest = @"
Pacote: $packageName
Gerado em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
RepoRoot: $repo

Objetivo dos ajustes:
1. Ajustar principalmente o link público das confirmações:
   /solucoes/presenca-querida/confirmacoes/TOKEN
2. Manter fixo no topo tudo que está circulado na imagem:
   - barra superior/área do topo;
   - linha "Presença Querida";
   - linha "Desenvolvido por Automação Extrema";
   - linha "Daniela 50 anos • 19/12/2026 • 12h30 às 17h30".
3. Corrigir o espaçamento do conteúdo abaixo do cabeçalho fixo para que o card "Acompanhamento público" não fique escondido.
4. Manter o comportamento mobile friendly, sem overflow horizontal.
5. Manter o link público somente leitura e sem ações administrativas.
"@

Set-Content -Path (Join-Path $tempRoot "MANIFESTO_DO_PACOTE.txt") -Value $manifest -Encoding UTF8

$zipPath = Join-Path $out "$packageName.zip"
$finalZip = New-ZipRobust -SourceDir $tempRoot -ZipPath $zipPath

if (-not (Test-Path -LiteralPath $finalZip)) { throw "O ZIP não foi encontrado após a geração: $finalZip" }

$sizeMb = [math]::Round((Get-Item -LiteralPath $finalZip).Length / 1MB, 2)
Write-AE "Pacote gerado com sucesso."
Write-Host ""
Write-Host "Arquivo para anexar no ChatGPT:"
Write-Host $finalZip
Write-Host ""
Write-Host "Tamanho: $sizeMb MB"

try {
  Set-Clipboard -Value $finalZip
  Write-AE "Caminho copiado para a área de transferência."
} catch {
  Write-AE "Não foi possível copiar para a área de transferência."
}

try { explorer.exe /select,"$finalZip" } catch { Write-AE "Não foi possível abrir o Explorer automaticamente." }
