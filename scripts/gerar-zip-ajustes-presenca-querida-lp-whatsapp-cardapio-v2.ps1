param(
  [string]$RepoRoot = ".",
  [string]$OutDir = ".",
  [string]$ExtraAssetsDir = "",
  [switch]$NoOpenFolder
)

$ErrorActionPreference = "Stop"

try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

function Write-AeLog {
  param([string]$Message)
  Write-Host "[AE] $Message"
}

function Resolve-FullPath {
  param([string]$PathValue)

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return $null
  }

  $item = Get-Item -LiteralPath $PathValue -ErrorAction SilentlyContinue
  if ($item) {
    return $item.FullName
  }

  return [System.IO.Path]::GetFullPath($PathValue)
}

function Ensure-Directory {
  param([string]$PathValue)

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return
  }

  if (-not (Test-Path -LiteralPath $PathValue)) {
    New-Item -ItemType Directory -Path $PathValue -Force | Out-Null
  }
}

function Should-ExcludePath {
  param([string]$FullName)

  $normalized = $FullName -replace '/', '\'
  $exclusions = @(
    '\node_modules\',
    '\.next\',
    '\.git\',
    '\.vercel\',
    '\dist\',
    '\build\',
    '\coverage\',
    '\.turbo\'
  )

  foreach ($item in $exclusions) {
    if ($normalized.Contains($item)) {
      return $true
    }
  }

  $leaf = Split-Path -Leaf $FullName

  if ($leaf -match '^\.env$') {
    return $true
  }

  if ($leaf -match '^\.env\.' -and $leaf -ne ".env.example") {
    return $true
  }

  return $false
}

function Get-RelativePathSafe {
  param(
    [string]$FullPath,
    [string]$RootPath
  )

  $sourceFull = (Get-Item -LiteralPath $FullPath).FullName
  $rootFull = (Get-Item -LiteralPath $RootPath).FullName.TrimEnd('\', '/')

  if ($sourceFull.Length -lt $rootFull.Length) {
    throw "Caminho fora da raiz: $sourceFull"
  }

  $relative = $sourceFull.Substring($rootFull.Length)
  $relative = $relative -replace '^[\\/]+', ''
  return $relative
}

function Copy-FileKeepingRelativePath {
  param(
    [string]$SourceFile,
    [string]$RootPath,
    [string]$DestinationRoot
  )

  if (Should-ExcludePath $SourceFile) {
    return
  }

  $relative = Get-RelativePathSafe -FullPath $SourceFile -RootPath $RootPath
  $destinationFile = Join-Path $DestinationRoot $relative
  $destinationDir = Split-Path -Parent $destinationFile

  Ensure-Directory $destinationDir
  Copy-Item -LiteralPath $SourceFile -Destination $destinationFile -Force
}

function Copy-PathToPackage {
  param(
    [string]$RelativePath,
    [string]$RootPath,
    [string]$DestinationRoot
  )

  $cleanRelative = $RelativePath.Trim() -replace '^[\\/]+', ''
  $source = Join-Path $RootPath $cleanRelative

  if (-not (Test-Path -LiteralPath $source)) {
    Write-Host "[AE] Aviso: não encontrado, ignorando: $cleanRelative"
    return
  }

  $item = Get-Item -LiteralPath $source

  if (-not $item.PSIsContainer) {
    Copy-FileKeepingRelativePath -SourceFile $item.FullName -RootPath $RootPath -DestinationRoot $DestinationRoot
    return
  }

  Get-ChildItem -LiteralPath $item.FullName -Recurse -Force | ForEach-Object {
    if ($_.PSIsContainer) {
      return
    }

    Copy-FileKeepingRelativePath -SourceFile $_.FullName -RootPath $RootPath -DestinationRoot $DestinationRoot
  }
}

$RepoRootResolved = Resolve-FullPath $RepoRoot
$OutDirResolved = Resolve-FullPath $OutDir

if (-not (Test-Path -LiteralPath $RepoRootResolved)) {
  throw "RepoRoot não encontrado: $RepoRootResolved"
}

Ensure-Directory $OutDirResolved

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "ae-presenca-querida-ajustes-lp-whatsapp-cardapio-$timestamp"
$tempRoot = Join-Path $env:TEMP $packageName
$zipPath = Join-Path $OutDirResolved "$packageName.zip"

if (Test-Path -LiteralPath $tempRoot) {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force
}

Ensure-Directory $tempRoot

Write-AeLog "Preparando pacote em: $tempRoot"
Write-AeLog "Copiando arquivos da última versão necessários para os ajustes..."

$paths = @(
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

  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/globals.css",
  "src/app/solucoes/page.tsx",
  "src/app/solucoes/layout.tsx",

  "src/app/bazar-sementinha/page.tsx",
  "src/app/bazar-sementinha/gestao",
  "src/app/bazar-sementinha/login",
  "src/app/api/bazar-sementinha/config",
  "src/app/api/bazar-sementinha/bootstrap",

  "supabase/sql",
  "public/presenca-querida",
  "public/ae",
  "public/logo",
  "public/logos",
  "public/solucoes"
)

foreach ($path in $paths) {
  Copy-PathToPackage -RelativePath $path -RootPath $RepoRootResolved -DestinationRoot $tempRoot
}

if (-not [string]::IsNullOrWhiteSpace($ExtraAssetsDir)) {
  $ExtraAssetsResolved = Resolve-FullPath $ExtraAssetsDir

  if (Test-Path -LiteralPath $ExtraAssetsResolved) {
    Write-AeLog "Incluindo assets extras informados em: $ExtraAssetsResolved"

    $extraDest = Join-Path $tempRoot "_assets_enviados_pelo_usuario"
    Ensure-Directory $extraDest

    Get-ChildItem -LiteralPath $ExtraAssetsResolved -File -Recurse -Force | ForEach-Object {
      if (Should-ExcludePath $_.FullName) {
        return
      }

      $relative = Get-RelativePathSafe -FullPath $_.FullName -RootPath $ExtraAssetsResolved
      $destinationFile = Join-Path $extraDest $relative
      $destinationDir = Split-Path -Parent $destinationFile

      Ensure-Directory $destinationDir
      Copy-Item -LiteralPath $_.FullName -Destination $destinationFile -Force
    }
  } else {
    Write-Host "[AE] Aviso: ExtraAssetsDir não encontrado, ignorando: $ExtraAssetsDir"
  }
}

$manifestPath = Join-Path $tempRoot "MANIFESTO_AJUSTES_LP_WHATSAPP_CARDAPIO.txt"

@"
Pacote para ajustes Presença Querida - Daniela 50 anos
Gerado em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Objetivo dos ajustes:
1. WhatsApp mais persuasivo seguindo Deep Dive, com grau de parentesco/origem do relacionamento.
2. Explicar por que o convite está sendo enviado com meses de antecedência: dezembro tem muitas festas e compromissos.
3. Cabeçalho mobile com terceira linha de âncoras: convite afetivo, quando/onde, confirmação, programação e cardápio.
4. Reorganizar LP: foto da Daniela após texto inicial, juntar Quando/Onde, fotos da chácara, botões Maps/Instagram.
5. Confirmação em destaque na LP com prazo final 19/11/2026.
6. Remover textos repetidos e blocos redundantes.
7. Cardápio visual sem preços, estilo Festa Junina/Tucxa, com textos persuasivos.
8. Usar fotos novas: Chopp Kremer, DJ Gabriel, Raça de Quintal, Chácara Piloto e cardápio.

Observação:
Se as novas imagens ainda não estiverem em public/presenca-querida, elas devem ser incluídas pelo parâmetro -ExtraAssetsDir.
"@ | Set-Content -LiteralPath $manifestPath -Encoding UTF8

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Write-AeLog "Gerando ZIP: $zipPath"
Compress-Archive -LiteralPath (Join-Path $tempRoot "*") -DestinationPath $zipPath -Force

if (-not (Test-Path -LiteralPath $zipPath)) {
  throw "O ZIP não foi encontrado após a geração: $zipPath"
}

$zipInfo = Get-Item -LiteralPath $zipPath
$sizeMb = [math]::Round($zipInfo.Length / 1MB, 2)

Write-AeLog "Pacote gerado com sucesso."
Write-Host ""
Write-Host "Arquivo para anexar no ChatGPT:"
Write-Host $zipPath
Write-Host ""
Write-Host "Tamanho aproximado: $sizeMb MB"
Write-Host ""

try {
  Set-Clipboard -Value $zipPath
  Write-Host "O caminho do ZIP foi copiado para a área de transferência."
} catch {
  Write-Host "Não foi possível copiar o caminho para a área de transferência, mas o arquivo foi gerado."
}

if (-not $NoOpenFolder) {
  try {
    explorer.exe "/select,$zipPath" | Out-Null
  } catch {
    Write-Host "Não foi possível abrir o Explorer automaticamente."
  }
}

Write-Host ""
Write-Host "Para incluir as imagens novas, rode assim:"
Write-Host 'powershell -ExecutionPolicy Bypass -File .\gerar-zip-ajustes-presenca-querida-lp-whatsapp-cardapio-v2.ps1 -RepoRoot . -OutDir . -ExtraAssetsDir "C:\Users\lacos\Downloads\Dani50Fotos"'
