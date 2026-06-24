param(
  [string]$RepoRoot = ".",
  [string]$OutDir = ".",
  [string]$ExtraAssetsDir = ""
)

$ErrorActionPreference = "Stop"

function Write-AE($Message) {
  Write-Host "[AE] $Message"
}

function Resolve-FullPath([string]$PathValue) {
  $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($PathValue)
}

function Should-SkipPath {
  param([string]$FullName)

  $normalized = $FullName -replace '\\', '/'
  $skipFragments = @(
    '/node_modules/',
    '/.next/',
    '/.git/',
    '/.vercel/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.turbo/',
    '/tmp/'
  )

  foreach ($fragment in $skipFragments) {
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
  param(
    [Parameter(Mandatory=$true)][string]$SourceDir,
    [Parameter(Mandatory=$true)][string]$TargetDir
  )

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
  param(
    [Parameter(Mandatory=$true)][string]$RelativePath,
    [Parameter(Mandatory=$true)][string]$SourceRoot,
    [Parameter(Mandatory=$true)][string]$TargetRoot
  )

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
  param(
    [Parameter(Mandatory=$true)][string]$SourceDir,
    [Parameter(Mandatory=$true)][string]$ZipPath
  )

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

if (-not (Test-Path -LiteralPath $repo)) {
  throw "RepoRoot não encontrado: $repo"
}

if (-not (Test-Path -LiteralPath $out)) {
  New-Item -ItemType Directory -Path $out -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "ae-presenca-querida-ajustes-edicao-confirmacao-cardapio-$timestamp"
$tempRoot = Join-Path $env:TEMP $packageName

if (Test-Path -LiteralPath $tempRoot) {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

Write-AE "Preparando pacote em: $tempRoot"
Write-AE "Copiando arquivos necessários para editar mensagens, convidados, confirmação na LP e cardápio..."

$paths = @(
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

  "src/app/solucoes/presenca-querida/page.tsx",
  "src/app/solucoes/presenca-querida/evento/[slug]/page.tsx",
  "src/app/solucoes/presenca-querida/confirmar/[token]/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/convidados/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/mensagens/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/confirmacoes/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/relatorios/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/cadastro/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/primeiros-passos/page.tsx",
  "src/app/solucoes/presenca-querida/login/page.tsx",
  "src/app/solucoes/presenca-querida/obrigado/page.tsx",
  "src/app/solucoes/presenca-querida/quero-conhecer/page.tsx",

  "src/app/api/presenca-querida/confirmar/[token]/route.ts",
  "src/app/api/presenca-querida/eventos/[slug]/route.ts",
  "src/app/api/presenca-querida/cliente/event/route.ts",
  "src/app/api/presenca-querida/cliente/guests/route.ts",
  "src/app/api/presenca-querida/cliente/guests/import/route.ts",
  "src/app/api/presenca-querida/cliente/guests/template/route.ts",
  "src/app/api/presenca-querida/cliente/messages/route.ts",
  "src/app/api/presenca-querida/cliente/messages/generate-invitations/route.ts",
  "src/app/api/presenca-querida/cliente/dashboard/route.ts",
  "src/app/api/presenca-querida/cliente/onboarding/route.ts",
  "src/app/api/presenca-querida/leads/route.ts",
  "src/app/api/presenca-querida/leads/lookup/route.ts",

  "src/lib/presenca-daniela50.ts",
  "src/lib/presenca-querida.ts",
  "src/lib/presenca-auth.ts",
  "src/lib/supabase-admin.ts",
  "src/lib/botconversa.ts",
  "src/components/presenca-public-confirmation.tsx",
  "src/components/presenca-client-header.tsx",
  "src/components/presenca-contextual-help.tsx",
  "src/components/presenca-onboarding-checklist.tsx",
  "src/components/ae-solution-header.tsx",
  "src/components/site-header.tsx",

  "src/app/layout.tsx",
  "src/app/globals.css",

  "public/presenca-querida",
  "supabase/sql"
)

foreach ($path in $paths) {
  Copy-ItemSafe -RelativePath $path -SourceRoot $repo -TargetRoot $tempRoot
}

if ($ExtraAssetsDir -and (Test-Path -LiteralPath $ExtraAssetsDir)) {
  $extraTarget = Join-Path $tempRoot "_assets_extras"
  Write-AE "Incluindo assets extras informados em: $ExtraAssetsDir"
  Copy-DirectoryFiltered -SourceDir (Resolve-FullPath $ExtraAssetsDir) -TargetDir $extraTarget
} elseif ($ExtraAssetsDir) {
  Write-AE "Aviso: ExtraAssetsDir informado, mas não encontrado: $ExtraAssetsDir"
}

$manifest = @"
Pacote: $packageName
Gerado em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
RepoRoot: $repo

Objetivo dos próximos ajustes:
1. Corrigir botão Editar/Salvar em Mensagens > Convites para aprovação.
2. Mostrar alerta de aprovação e trocar botão Aprovar para Reprovar.
3. Corrigir botão Editar/Salvar em Convidados.
4. Na LP pública, quando houver convidados vinculados, permitir confirmar somente o convidado principal ou todos do convite.
5. Mover o card Seu Convite/Confirmação para o final da LP.
6. Ajustar cardápio: separar Bolo de Abacaxi e Docinhos do card de bebidas.
7. Colocar foto do Chopp Kremer logo após o texto do chopp dentro do card de bebidas.
8. Remover informação duplicada de Bolo de Abacaxi e Docinhos no bloco final.
"@

Set-Content -Path (Join-Path $tempRoot "MANIFESTO_DO_PACOTE.txt") -Value $manifest -Encoding UTF8

$zipPath = Join-Path $out "$packageName.zip"
$finalZip = New-ZipRobust -SourceDir $tempRoot -ZipPath $zipPath

if (-not (Test-Path -LiteralPath $finalZip)) {
  throw "O ZIP não foi encontrado após a geração: $finalZip"
}

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

try {
  explorer.exe /select,"$finalZip"
} catch {
  Write-AE "Não foi possível abrir o Explorer automaticamente."
}
