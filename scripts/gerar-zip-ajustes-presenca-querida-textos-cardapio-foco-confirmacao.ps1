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
  if (-not (Test-Path -LiteralPath $TargetDir)) { New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null }
  $sourceRootResolved = Resolve-FullPath $SourceDir
  Get-ChildItem -LiteralPath $SourceDir -Recurse -Force | ForEach-Object {
    if (Should-SkipPath $_.FullName) { return }
    $subPath = $_.FullName.Substring($sourceRootResolved.Length) -replace '^[\\/]+', ''
    $dest = Join-Path $TargetDir $subPath
    if ($_.PSIsContainer) {
      if (-not (Test-Path -LiteralPath $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
    } else {
      $destParent = Split-Path -Parent $dest
      if ($destParent -and -not (Test-Path -LiteralPath $destParent)) { New-Item -ItemType Directory -Path $destParent -Force | Out-Null }
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
  if ($targetParent -and -not (Test-Path -LiteralPath $targetParent)) { New-Item -ItemType Directory -Path $targetParent -Force | Out-Null }

  if ((Get-Item -LiteralPath $source).PSIsContainer) {
    Copy-DirectoryFiltered -SourceDir $source -TargetDir $target
  } else {
    Copy-Item -LiteralPath $source -Destination $target -Force
  }
}

function New-ZipRobust {
  param([string]$SourceDir, [string]$ZipPath)
  if (Test-Path -LiteralPath $ZipPath) { Remove-Item -LiteralPath $ZipPath -Force }

  $sourceFull = Resolve-FullPath $SourceDir
  $zipParent = Resolve-FullPath (Split-Path -Parent $ZipPath)
  $zipFull = Join-Path $zipParent ([System.IO.Path]::GetFileName($ZipPath))

  Write-AE "Tentando compactar com .NET ZipFile..."
  try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($sourceFull, $zipFull)
  } catch { Write-AE "Falha no .NET ZipFile: $($_.Exception.Message)" }
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
  try { Compress-Archive -Path (Join-Path $sourceFull "*") -DestinationPath $zipFull -Force } catch { Write-AE "Falha no Compress-Archive: $($_.Exception.Message)" }
  if (Test-Path -LiteralPath $zipFull) { return $zipFull }

  throw "Não foi possível gerar o ZIP em: $zipFull"
}

$repo = Resolve-FullPath $RepoRoot
$out = Resolve-FullPath $OutDir
if (-not (Test-Path -LiteralPath $repo)) { throw "RepoRoot não encontrado: $repo" }
if (-not (Test-Path -LiteralPath $out)) { New-Item -ItemType Directory -Path $out -Force | Out-Null }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "ae-presenca-querida-ajustes-textos-cardapio-foco-confirmacao-$timestamp"
$tempRoot = Join-Path $env:TEMP $packageName
if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

Write-AE "Preparando pacote em: $tempRoot"
Write-AE "Copiando arquivos necessários para ajustes de textos, cardápio e foco padrão da confirmação..."

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

  "src/app/solucoes/presenca-querida/evento/[slug]/page.tsx",
  "src/app/solucoes/presenca-querida/evento/[slug]/obrigado/page.tsx",
  "src/app/solucoes/presenca-querida/confirmar/[token]/page.tsx",
  "src/app/solucoes/presenca-querida/obrigado/page.tsx",

  "src/app/solucoes/presenca-querida/cliente/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/cadastro/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/convidados/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/mensagens/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/confirmacoes/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/relatorios/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/primeiros-passos/page.tsx",

  "src/app/api/presenca-querida/confirmar/[token]/route.ts",
  "src/app/api/presenca-querida/eventos/[slug]/route.ts",
  "src/app/api/presenca-querida/cliente/event/route.ts",
  "src/app/api/presenca-querida/cliente/guests/route.ts",
  "src/app/api/presenca-querida/cliente/messages/route.ts",
  "src/app/api/presenca-querida/cliente/messages/generate-invitations/route.ts",
  "src/app/api/presenca-querida/cliente/dashboard/route.ts",

  "src/lib/presenca-daniela50.ts",
  "src/lib/presenca-querida.ts",
  "src/lib/presenca-auth.ts",
  "src/lib/supabase-admin.ts",
  "src/lib/mail.ts",
  "src/components/presenca-public-confirmation.tsx",
  "src/components/presenca-client-header.tsx",
  "src/components/ae-solution-header.tsx",

  "src/app/layout.tsx",
  "src/app/globals.css",
  "public/presenca-querida",
  "supabase/sql"
)

foreach ($path in $paths) { Copy-ItemSafe -RelativePath $path -SourceRoot $repo -TargetRoot $tempRoot }

$manifest = @"
Pacote: $packageName
Gerado em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
RepoRoot: $repo

Objetivo dos ajustes:
1. Incluir café e petit fours nas categorias corretas do cardápio.
2. Na seção de bolo/doces, usar somente: Bolo e doces finos, sem citar sabor do bolo.
3. Trocar headline para: Sua presença é muito querida nos meus 50 anos.
4. Trocar texto introdutório para:
   Quero celebrar meus 50 anos com pessoas que fazem parte da minha história.
   Esta página reúne detalhes da festa e também permite a confirmação da sua presença.
5. Trocar endereço exibido para: Valinhos, Campinas - SP.
6. Para quem ainda não confirmou presença, deixar sempre a opção "Sim, confirma presença" como foco/padrão marcado.
7. Trocar descrição da Banda Raça de Quintal para:
   No melhor momento da tarde, a Banda Raça de Quintal entra para embalar a celebração com muito samba e alegria!
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
