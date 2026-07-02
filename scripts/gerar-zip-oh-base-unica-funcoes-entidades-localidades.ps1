$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$ZipName = "organizacao-em-harmonia-base-unica-funcoes-entidades-localidades-$Timestamp.zip"
$ZipPath = Join-Path $Root $ZipName
$TempDir = Join-Path $env:TEMP "organizacao-em-harmonia-base-unica-funcoes-entidades-localidades-$Timestamp"

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

$IncludePaths = @(
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "middleware.ts",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "postcss.config.js",
  "postcss.config.mjs",
  ".env.example",
  "README.md",

  "src/app/admin/ae",
  "src/app/api/admin",

  "src/app/solucoes/organizacao-em-harmonia",
  "src/app/api/organizacao-em-harmonia",
  "src/app/api/admin/organizacao-em-harmonia",
  "src/app/admin/ae/organizacao-em-harmonia",
  "src/app/api/cron/organizacao-em-harmonia-reminders",

  "src/app/solucoes/agenda-viva",
  "src/app/api/agenda-viva",
  "src/app/api/admin/agenda-viva",

  "src/app/solucoes/atendimento-em-harmonia",
  "src/app/api/atendimento-em-harmonia",
  "src/app/api/admin/atendimento-em-harmonia",

  "src/app/solucoes/corrente-em-dia",
  "src/app/api/corrente-em-dia",
  "src/app/api/admin/corrente-em-dia",
  "src/app/admin/ae/corrente-em-dia",

  "src/app/solucoes/presenca-querida",
  "src/app/api/presenca-querida",
  "src/app/api/admin/presenca-querida",
  "src/app/admin/ae/presenca-querida",

  "src/app/api/whatsapp",
  "src/app/api/cron",

  "src/components",
  "src/lib",
  "src/hooks",
  "src/types",
  "src/utils",
  "src/contexts",
  "src/styles",
  "src/app/globals.css",

  "public",
  "docs",
  "supabase",
  "sql"
)

if (Test-Path $TempDir) {
  Remove-Item $TempDir -Recurse -Force
}

New-Item -Path $TempDir -ItemType Directory | Out-Null

function Test-ExcludedPath {
  param([string]$RelativePath)

  $parts = $RelativePath -split "[\\/]"
  foreach ($part in $parts) {
    if ($ExcludeDirs -contains $part) {
      return $true
    }
  }

  return $false
}

function Copy-ItemSafe {
  param(
    [string]$SourcePath,
    [string]$DestinationRoot
  )

  if (!(Test-Path $SourcePath)) {
    Write-Host "Aviso: caminho não encontrado -> $SourcePath" -ForegroundColor Yellow
    return
  }

  $item = Get-Item $SourcePath -Force

  if ($item.PSIsContainer) {
    Get-ChildItem -Path $SourcePath -Recurse -Force | ForEach-Object {
      if ($_.PSIsContainer) {
        return
      }

      $full = $_.FullName
      $relative = $full.Substring($Root.Length).TrimStart("\", "/")
      $fileName = $_.Name

      if (Test-ExcludedPath $relative) {
        return
      }

      if ($ExcludeFiles -contains $fileName) {
        return
      }

      if ($fileName -like ".env*" -and $fileName -ne ".env.example") {
        return
      }

      $destination = Join-Path $DestinationRoot $relative
      $destinationFolder = Split-Path $destination -Parent

      New-Item -Path $destinationFolder -ItemType Directory -Force | Out-Null
      Copy-Item $full $destination -Force
    }
  }
  else {
    $fileName = $item.Name
    $relative = $item.FullName.Substring($Root.Length).TrimStart("\", "/")

    if (Test-ExcludedPath $relative) {
      return
    }

    if ($ExcludeFiles -contains $fileName) {
      return
    }

    if ($fileName -like ".env*" -and $fileName -ne ".env.example") {
      return
    }

    $destination = Join-Path $DestinationRoot $relative
    $destinationFolder = Split-Path $destination -Parent

    New-Item -Path $destinationFolder -ItemType Directory -Force | Out-Null
    Copy-Item $item.FullName $destination -Force
  }
}

foreach ($path in $IncludePaths) {
  $source = Join-Path $Root $path
  Copy-ItemSafe -SourcePath $source -DestinationRoot $TempDir
}

$Readme = @"
ZIP gerado para evolução da Organização em Harmonia.

Objetivos:
1. Incluir opção de excluir lead no Funil / CRM da AE.
2. Criar cadastro de múltiplas localidades da organização.
3. Separar Base Única em páginas/submenus:
   - Visão geral
   - Envolvidos
   - Funções
   - Entidades
   - Grupos
   - Vínculos em lote
   - Permissões
   - Localidades
   - Importação
   - Orientações / Documentos
4. Melhorar usabilidade dos cadastros de pessoas e funções.
5. Criar cadastro de entidades e linhas de trabalho.
6. Vincular entidades a cavalinhos, cambonos, dias de atendimento e grupos.
7. Criar edição em lote de vínculos operacionais.
8. Incluir conteúdo dos documentos do Tucxa como biblioteca/orientações internas.
9. Atualizar SQL, documentação e roteiro de testes.
"@

Set-Content -Path (Join-Path $TempDir "_README_ZIP_OH_BASE_UNICA_FUNCOES_ENTIDADES_LOCALIDADES.txt") -Value $Readme -Encoding UTF8

if (Test-Path $ZipPath) {
  Remove-Item $ZipPath -Force
}

Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $ZipPath -Force
Remove-Item $TempDir -Recurse -Force

Write-Host ""
Write-Host "ZIP gerado com sucesso:"
Write-Host $ZipPath
Write-Host ""