param(
  [string]$RepoRoot = ".",
  [string]$OutDir = ".",
  [string[]]$ExtraPaths = @()
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host "[AE/PQ] $message" -ForegroundColor Cyan
}

function Resolve-FullPath([string]$path) {
  $item = Get-Item -LiteralPath $path -ErrorAction Stop
  return $item.FullName
}

function Normalize-RelativePath([string]$relativePath) {
  if ([string]::IsNullOrWhiteSpace($relativePath)) { return "" }
  $clean = $relativePath.Trim() -replace '^[\\/]+', ''
  $clean = $clean -replace '/', [System.IO.Path]::DirectorySeparatorChar
  return $clean
}

function Test-ExcludedPath([string]$path) {
  $normalized = $path -replace '/', '\\'
  $segments = $normalized -split '\\+'

  $excludedDirs = @(
    'node_modules', '.next', '.vercel', '.git', 'dist', 'build',
    'coverage', '.turbo', '.cache', 'out'
  )

  foreach ($dir in $excludedDirs) {
    if ($segments -contains $dir) { return $true }
  }

  $leaf = Split-Path -Leaf $path
  $excludedFiles = @(
    '.env', '.env.local', '.env.production', '.env.development',
    '.DS_Store', 'Thumbs.db'
  )

  if ($excludedFiles -contains $leaf) { return $true }
  return $false
}

function Copy-FileKeepingPath([string]$sourceFile, [string]$destinationRoot, [string]$repoRootResolved) {
  if (Test-ExcludedPath $sourceFile) { return }

  $relative = $sourceFile.Substring($repoRootResolved.Length) -replace '^[\\/]+', ''
  $destination = Join-Path $destinationRoot $relative
  $destinationDir = Split-Path -Parent $destination

  if (!(Test-Path -LiteralPath $destinationDir)) {
    New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
  }

  Copy-Item -LiteralPath $sourceFile -Destination $destination -Force
}

function Add-PathToPackage([string]$relativePath, [string]$repoRootResolved, [string]$stagingRoot) {
  $relativePath = Normalize-RelativePath $relativePath
  if ([string]::IsNullOrWhiteSpace($relativePath)) { return }

  $source = Join-Path $repoRootResolved $relativePath

  if (!(Test-Path -LiteralPath $source)) {
    Write-Host "[AE/PQ] Ignorado, não encontrado: $relativePath" -ForegroundColor DarkYellow
    return
  }

  $item = Get-Item -LiteralPath $source
  if ($item.PSIsContainer) {
    Get-ChildItem -LiteralPath $source -Recurse -File | ForEach-Object {
      Copy-FileKeepingPath -sourceFile $_.FullName -destinationRoot $stagingRoot -repoRootResolved $repoRootResolved
    }
  } else {
    Copy-FileKeepingPath -sourceFile $item.FullName -destinationRoot $stagingRoot -repoRootResolved $repoRootResolved
  }
}

$repoRootResolved = Resolve-FullPath $RepoRoot
$outDirResolved = Resolve-FullPath $OutDir
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "ae-presenca-querida-ajustes-daniela50-$timestamp"
$stagingRoot = Join-Path $env:TEMP $packageName
$zipPath = Join-Path $outDirResolved "$packageName.zip"

Write-Step "Preparando pasta temporária..."
if (Test-Path -LiteralPath $stagingRoot) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

Write-Step "Copiando arquivos de configuração do projeto..."
$rootFiles = @(
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'tsconfig.json',
  'tailwind.config.js',
  'tailwind.config.ts',
  'postcss.config.js',
  'postcss.config.mjs',
  'eslint.config.js',
  'eslint.config.mjs',
  '.eslintrc.json',
  '.env.example',
  'README.md',
  'middleware.ts',
  'src/middleware.ts'
)
foreach ($path in $rootFiles) {
  Add-PathToPackage -relativePath $path -repoRootResolved $repoRootResolved -stagingRoot $stagingRoot
}

Write-Step "Copiando Presença Querida completo..."
$presencaPaths = @(
  'src/app/solucoes/presenca-querida',
  'src/app/api/presenca-querida',
  'src/lib/presenca-querida.ts',
  'src/lib/botconversa.ts',
  'src/lib/supabase.ts',
  'src/lib/supabase-admin.ts',
  'src/lib/email.ts',
  'src/lib/mailer.ts',
  'src/lib/ae-access.ts',
  'src/lib/ae-leads.ts',
  'src/lib/ae-solutions.ts',
  'src/types',
  'src/config'
)
foreach ($path in $presencaPaths) {
  Add-PathToPackage -relativePath $path -repoRootResolved $repoRootResolved -stagingRoot $stagingRoot
}

Write-Step "Copiando componentes e estilos compartilhados..."
$sharedPaths = @(
  'src/components',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/app/globals.css',
  'src/app/solucoes/page.tsx',
  'src/app/solucoes/layout.tsx',
  'src/app/c/[slug]'
)
foreach ($path in $sharedPaths) {
  Add-PathToPackage -relativePath $path -repoRootResolved $repoRootResolved -stagingRoot $stagingRoot
}

Write-Step "Copiando referência de menu lateral do Bazar no Controle..."
$bazarReferencePaths = @(
  'src/app/bazar-sementinha/gestao',
  'src/app/bazar-sementinha/page.tsx',
  'src/app/bazar-sementinha/login',
  'src/app/api/bazar-sementinha/config',
  'src/app/api/bazar-sementinha/bootstrap'
)
foreach ($path in $bazarReferencePaths) {
  Add-PathToPackage -relativePath $path -repoRootResolved $repoRootResolved -stagingRoot $stagingRoot
}

Write-Step "Copiando SQLs e assets públicos relevantes..."
$databaseAndAssetsPaths = @(
  'supabase/sql',
  'sql',
  'prisma',
  'public/ae',
  'public/logo',
  'public/logos',
  'public/solucoes',
  'public/presenca-querida',
  'public/bazar-sementinha'
)
foreach ($path in $databaseAndAssetsPaths) {
  Add-PathToPackage -relativePath $path -repoRootResolved $repoRootResolved -stagingRoot $stagingRoot
}

if ($ExtraPaths.Count -gt 0) {
  Write-Step "Copiando caminhos extras informados..."
  foreach ($path in $ExtraPaths) {
    Add-PathToPackage -relativePath $path -repoRootResolved $repoRootResolved -stagingRoot $stagingRoot
  }
}

Write-Step "Gerando manifesto do pacote..."
$manifestPath = Join-Path $stagingRoot 'MANIFESTO_AJUSTES_PRESENCA_QUERIDA_DANIELA50.txt'
@"
Pacote para ajustes do Presença Querida - Daniela 50 anos
Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Origem: $repoRootResolved

Objetivo do pacote:
- Landing pública do evento Daniela 50 anos com dados reais, Google Maps, atrações, buffet/cardápio e fotos.
- Área do cliente com cadastro completo do evento e upload/uso de fotos do aniversariante.
- Cadastro/importação de convidados com parentesco ou origem do relacionamento.
- Template CSV para importação de convidados.
- CRUD completo: editar, ativar/inativar, excluir e salvar.
- Menu lateral no padrão Bazar no Controle.
- Aprovação prévia dos convites personalizados antes do envio no WhatsApp.
- Preservar estratégia Oceano Azul, mobile friendly e Deep Dive.

Observação:
- Este pacote não inclui .env real, node_modules, .next, .git ou arquivos sensíveis.
- Se as fotos/cardápio da Daniela já foram anexados no ChatGPT, não é necessário incluir de novo aqui.
- Se você também copiou fotos/cardápio para o repositório, elas serão incluídas se estiverem em public/presenca-querida, public/solucoes ou caminhos extras passados em -ExtraPaths.
"@ | Set-Content -LiteralPath $manifestPath -Encoding UTF8

Write-Step "Compactando ZIP..."
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -Path (Join-Path $stagingRoot '*') -DestinationPath $zipPath -Force

Write-Step "Limpando temporários..."
Remove-Item -LiteralPath $stagingRoot -Recurse -Force

Write-Host "" 
Write-Host "ZIP gerado com sucesso:" -ForegroundColor Green
Write-Host $zipPath -ForegroundColor Green
