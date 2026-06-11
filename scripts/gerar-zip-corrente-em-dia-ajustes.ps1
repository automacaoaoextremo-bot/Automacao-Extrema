$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$ProjectName = "automacao-extrema"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$ZipName = "corrente-em-dia-ajustes-ui-$Timestamp.zip"
$ZipPath = Join-Path $Root $ZipName
$TempDir = Join-Path $env:TEMP "corrente-em-dia-ajustes-$Timestamp"

$ExcludeDirs = @(
  ".git",
  ".next",
  "node_modules",
  ".vercel",
  "out",
  "dist",
  "build",
  ".turbo",
  ".cache",
  "coverage"
)

$ExcludeFiles = @(
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.production.local",
  ".env.test.local",
  "tsconfig.tsbuildinfo",
  "npm-debug.log",
  "yarn-error.log",
  "pnpm-debug.log",
  ".DS_Store",
  "Thumbs.db"
)

if (Test-Path $TempDir) {
  Remove-Item $TempDir -Recurse -Force
}
New-Item -Path $TempDir -ItemType Directory | Out-Null

# Arquivos/pastas prioritários para os ajustes
$IncludePaths = @(
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "middleware.ts",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "tailwind.config.js",
  "tailwind.config.ts",
  "postcss.config.js",
  "postcss.config.mjs",
  ".env.example",
  "README.md",

  "src/app/solucoes/corrente-em-dia",
  "src/app/c",
  "src/app/login",
  "src/app/admin/ae/corrente-em-dia",
  "src/app/api/admin/corrente-em-dia",

  "src/components",
  "src/lib",
  "src/hooks",
  "src/types",
  "src/utils",
  "src/contexts",
  "src/styles",

  "public",
  "supabase",
  "sql",
  "docs"
)

function Copy-ItemSafe {
  param(
    [string]$SourcePath,
    [string]$DestinationRoot
  )

  if (!(Test-Path $SourcePath)) {
    return
  }

  $Item = Get-Item $SourcePath -Force

  if ($Item.PSIsContainer) {
    Get-ChildItem -Path $SourcePath -Recurse -Force | ForEach-Object {
      $full = $_.FullName
      $relative = $full.Substring($Root.Length).TrimStart("\", "/")
      $parts = $relative -split "[\\/]"
      $fileName = $_.Name

      foreach ($part in $parts) {
        if ($ExcludeDirs -contains $part) { return }
      }

      if (!$_.PSIsContainer) {
        if ($ExcludeFiles -contains $fileName) { return }
        if ($fileName -like ".env*" -and $fileName -ne ".env.example") { return }

        $destination = Join-Path $DestinationRoot $relative
        $destinationFolder = Split-Path $destination -Parent
        New-Item -Path $destinationFolder -ItemType Directory -Force | Out-Null
        Copy-Item $full $destination -Force
      }
    }
  }
  else {
    $fileName = $Item.Name
    if ($ExcludeFiles -contains $fileName) { return }
    if ($fileName -like ".env*" -and $fileName -ne ".env.example") { return }

    $relative = $Item.FullName.Substring($Root.Length).TrimStart("\", "/")
    $destination = Join-Path $DestinationRoot $relative
    $destinationFolder = Split-Path $destination -Parent
    New-Item -Path $destinationFolder -ItemType Directory -Force | Out-Null
    Copy-Item $Item.FullName $destination -Force
  }
}

foreach ($path in $IncludePaths) {
  $source = Join-Path $Root $path
  Copy-ItemSafe -SourcePath $source -DestinationRoot $TempDir
}

$Readme = @"
ZIP gerado para ajustes visuais e funcionais do Corrente em Dia.

Objetivo:
- Ajustar cabeçalho no padrão Impacto no Controle
- Criar logo do Corrente em Dia
- Ajustar submenu da AE
- Revisar CTAs da landing
- Revisar copy da página pública
- Ajustar bloco Minha Contribuição com LGPD
- Substituir Piloto Recomendado por proposta Cliente Fundador

Excluídos propositalmente:
- node_modules
- .next
- .git
- .vercel
- arquivos .env reais
- caches e builds
"@

Set-Content -Path (Join-Path $TempDir "_README_ZIP_CORRENTE_EM_DIA.txt") -Value $Readme -Encoding UTF8

if (Test-Path $ZipPath) {
  Remove-Item $ZipPath -Force
}

Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $ZipPath -Force
Remove-Item $TempDir -Recurse -Force

Write-Host ""
Write-Host "ZIP gerado com sucesso:"
Write-Host $ZipPath
Write-Host ""