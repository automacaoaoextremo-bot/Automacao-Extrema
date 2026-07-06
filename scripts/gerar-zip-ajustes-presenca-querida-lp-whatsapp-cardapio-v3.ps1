param(
  [string]$RepoRoot = ".",
  [string]$OutDir = ".",
  [string]$ExtraAssetsDir = ""
)

$ErrorActionPreference = "Stop"

function Write-AE {
  param([string]$Message)
  Write-Host "[AE] $Message"
}

function Resolve-FullPath {
  param([string]$PathValue, [bool]$MustExist = $true)
  if ($MustExist) {
    return (Resolve-Path -LiteralPath $PathValue).Path
  }

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }

  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $PathValue))
}

$repoRootResolved = Resolve-FullPath -PathValue $RepoRoot -MustExist $true
$outDirResolved = Resolve-FullPath -PathValue $OutDir -MustExist $false

if (!(Test-Path -LiteralPath $outDirResolved)) {
  New-Item -ItemType Directory -Path $outDirResolved -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "ae-presenca-querida-ajustes-lp-whatsapp-cardapio-$timestamp"
$tempRoot = Join-Path $env:TEMP $packageName
$zipPath = Join-Path $outDirResolved "$packageName.zip"

Write-AE "Repo: $repoRootResolved"
Write-AE "Saida: $outDirResolved"
Write-AE "Preparando pacote em: $tempRoot"

if (Test-Path -LiteralPath $tempRoot) {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

$skipDirs = @(
  "node_modules",
  ".next",
  ".vercel",
  ".git",
  "dist",
  "build",
  "coverage"
)

$skipFiles = @(
  ".env",
  ".env.local",
  ".env.production",
  ".env.development"
)

function Should-SkipPath {
  param([string]$FullName)

  $parts = $FullName -split "[\\/]"
  foreach ($part in $parts) {
    if ($skipDirs -contains $part) {
      return $true
    }
  }

  $leaf = Split-Path -Leaf $FullName
  if ($skipFiles -contains $leaf) {
    return $true
  }

  return $false
}

function Copy-RelativeItem {
  param([string]$RelativePath)

  $relativeClean = ($RelativePath.Trim() -replace '^[\\/]+', '')
  $sourcePath = Join-Path $repoRootResolved $relativeClean

  if (!(Test-Path -LiteralPath $sourcePath)) {
    Write-AE "Aviso: nao encontrado, ignorando: $relativeClean"
    return
  }

  $destinationPath = Join-Path $tempRoot $relativeClean
  $destinationParent = Split-Path -Parent $destinationPath
  if (!(Test-Path -LiteralPath $destinationParent)) {
    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
  }

  $item = Get-Item -LiteralPath $sourcePath

  if ($item.PSIsContainer) {
    Get-ChildItem -LiteralPath $sourcePath -Recurse -Force | ForEach-Object {
      if (Should-SkipPath -FullName $_.FullName) { return }

      $subPath = $_.FullName.Substring($sourcePath.Length) -replace '^[\\/]+', ''
      $target = Join-Path $destinationPath $subPath

      if ($_.PSIsContainer) {
        if (!(Test-Path -LiteralPath $target)) {
          New-Item -ItemType Directory -Path $target -Force | Out-Null
        }
      } else {
        $targetParent = Split-Path -Parent $target
        if (!(Test-Path -LiteralPath $targetParent)) {
          New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
        }
        Copy-Item -LiteralPath $_.FullName -Destination $target -Force
      }
    }
  } else {
    if (!(Should-SkipPath -FullName $item.FullName)) {
      Copy-Item -LiteralPath $item.FullName -Destination $destinationPath -Force
    }
  }
}

Write-AE "Copiando arquivos da ultima versao necessarios para os ajustes..."

$itemsToCopy = @(
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "tsconfig.json",
  "tailwind.config.js",
  "tailwind.config.ts",
  "postcss.config.js",
  "postcss.config.mjs",
  "eslint.config.js",
  "eslint.config.mjs",
  ".eslintrc.json",
  ".env.example",
  "README.md",
  "middleware.ts",
  "src/middleware.ts",

  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/globals.css",

  "src/app/solucoes/presenca-querida",
  "src/app/api/presenca-querida",

  "src/components/presenca-public-confirmation.tsx",
  "src/components/presenca-client-header.tsx",
  "src/components",

  "src/lib/presenca-daniela50.ts",
  "src/lib/presenca-auth.ts",
  "src/lib/presenca-querida.ts",
  "src/lib/botconversa.ts",
  "src/lib/supabase.ts",
  "src/lib/supabase-admin.ts",
  "src/lib/email.ts",
  "src/lib/mailer.ts",
  "src/lib/ae-access.ts",
  "src/lib/ae-leads.ts",
  "src/lib/ae-solutions.ts",

  "src/types",
  "src/config",

  "src/app/bazar-sementinha/page.tsx",
  "src/app/bazar-sementinha/gestao",
  "src/app/api/bazar-sementinha/config",
  "src/app/api/bazar-sementinha/bootstrap",

  "supabase/sql",
  "sql",
  "prisma",

  "public/presenca-querida",
  "public/ae",
  "public/logo",
  "public/logos",
  "public/solucoes"
)

foreach ($path in $itemsToCopy) {
  Copy-RelativeItem -RelativePath $path
}

if ($ExtraAssetsDir.Trim().Length -gt 0) {
  $extraAssetsResolved = Resolve-FullPath -PathValue $ExtraAssetsDir -MustExist $true
  Write-AE "Incluindo assets extras informados em: $extraAssetsResolved"

  $extraDestination = Join-Path $tempRoot "_assets_recebidos_dani50"
  New-Item -ItemType Directory -Path $extraDestination -Force | Out-Null

  Get-ChildItem -LiteralPath $extraAssetsResolved -Recurse -Force | ForEach-Object {
    if ($_.PSIsContainer) { return }
    if (Should-SkipPath -FullName $_.FullName) { return }

    $subPath = $_.FullName.Substring($extraAssetsResolved.Length) -replace '^[\\/]+', ''
    $target = Join-Path $extraDestination $subPath
    $targetParent = Split-Path -Parent $target
    if (!(Test-Path -LiteralPath $targetParent)) {
      New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
    }
    Copy-Item -LiteralPath $_.FullName -Destination $target -Force
  }
}

# Manifesto para facilitar conferencia
$manifestPath = Join-Path $tempRoot "MANIFESTO_DO_PACOTE.txt"
$manifest = @()
$manifest += "Pacote: $packageName"
$manifest += "Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$manifest += "Repo: $repoRootResolved"
$manifest += ""
$manifest += "Conteudo:"
Get-ChildItem -LiteralPath $tempRoot -Recurse -File | ForEach-Object {
  $manifest += ($_.FullName.Substring($tempRoot.Length) -replace '^[\\/]+', '')
}
$manifest | Set-Content -LiteralPath $manifestPath -Encoding UTF8

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Write-AE "Gerando ZIP: $zipPath"

$created = $false
$zipErrors = New-Object System.Collections.Generic.List[string]

# Metodo 1: .NET ZipFile, mais confiavel que Compress-Archive em alguns ambientes
try {
  Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
  [System.IO.Compression.ZipFile]::CreateFromDirectory(
    $tempRoot,
    $zipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
  )
  if (Test-Path -LiteralPath $zipPath) { $created = $true }
} catch {
  $zipErrors.Add("ZipFile: $($_.Exception.Message)") | Out-Null
}

# Metodo 2: tar.exe, fallback do Windows
if (-not $created) {
  try {
    Push-Location $tempRoot
    & tar.exe -a -cf $zipPath *
    $tarExit = $LASTEXITCODE
    Pop-Location
    if ($tarExit -eq 0 -and (Test-Path -LiteralPath $zipPath)) { $created = $true }
    else { $zipErrors.Add("tar.exe retornou codigo $tarExit") | Out-Null }
  } catch {
    try { Pop-Location } catch {}
    $zipErrors.Add("tar.exe: $($_.Exception.Message)") | Out-Null
  }
}

# Metodo 3: Compress-Archive, ultimo fallback
if (-not $created) {
  try {
    Compress-Archive -Path (Join-Path $tempRoot "*") -DestinationPath $zipPath -Force -CompressionLevel Optimal
    if (Test-Path -LiteralPath $zipPath) { $created = $true }
  } catch {
    $zipErrors.Add("Compress-Archive: $($_.Exception.Message)") | Out-Null
  }
}

if (-not (Test-Path -LiteralPath $zipPath)) {
  Write-Host ""
  Write-Host "Falha ao gerar o ZIP. Tentativas:" -ForegroundColor Red
  foreach ($err in $zipErrors) { Write-Host "- $err" -ForegroundColor Red }
  Write-Host ""
  Write-Host "A pasta temporaria com os arquivos foi mantida aqui:" -ForegroundColor Yellow
  Write-Host $tempRoot -ForegroundColor Yellow
  throw "O ZIP nao foi encontrado apos as tentativas de geracao."
}

$zipItem = Get-Item -LiteralPath $zipPath
if ($zipItem.Length -le 0) {
  throw "O ZIP foi criado, mas esta vazio: $zipPath"
}

Write-Host ""
Write-AE "Pacote gerado com sucesso."
Write-Host "Arquivo para anexar no ChatGPT:" -ForegroundColor Green
Write-Host $zipItem.FullName -ForegroundColor Green
Write-Host ("Tamanho: {0:N2} MB" -f ($zipItem.Length / 1MB)) -ForegroundColor Green

try {
  Set-Clipboard -Value $zipItem.FullName
  Write-AE "Caminho copiado para a area de transferencia."
} catch {
  Write-AE "Nao foi possivel copiar para a area de transferencia."
}

try {
  explorer.exe "/select,$($zipItem.FullName)"
} catch {
  Write-AE "Nao foi possivel abrir o Explorer automaticamente."
}
