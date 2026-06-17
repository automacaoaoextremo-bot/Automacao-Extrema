$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$ZipName = "corrente-em-dia-area-logada-v1-$Timestamp.zip"
$ZipPath = Join-Path $Root $ZipName
$TempDir = Join-Path $env:TEMP "corrente-em-dia-area-logada-v1-$Timestamp"

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
  "tailwind.config.js",
  "tailwind.config.ts",
  "postcss.config.js",
  "postcss.config.mjs",
  ".env.example",
  "README.md",

  "src/app/solucoes/corrente-em-dia",
  "src/app/c",
  "src/app/api/corrente-em-dia",
  "src/app/api/admin/corrente-em-dia",
  "src/app/api/whatsapp",
  "src/app/api/cron",
  "src/app/admin/ae/corrente-em-dia",

  "src/components",
  "src/lib",
  "src/hooks",
  "src/types",
  "src/utils",
  "src/contexts",
  "src/styles",
  "src/app/globals.css",

  "public",
  "supabase",
  "sql",
  "docs"
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
ZIP gerado para ajustes da área logada Corrente em Dia V1.

Objetivo:
1. Ajustar cabeçalho logado:
   - Linha 1: logo + Corrente em Dia + Sair
   - Linha 2: Desenvolvido por AE
   - Linha 3: Cadastro | Contribuintes | Contribuir | Aprovações

2. Criar páginas específicas:
   - /cliente/cadastro
   - /cliente/contribuintes
   - /cliente/contribuir
   - /cliente/aprovacoes

3. Implementar cadastro da organização:
   - dados vindos do Quero Conhecer
   - organização, Pix, contribuições, datas, lembretes, UF, cidade, CEP e endereço

4. Implementar contribuintes:
   - lista, filtros, inclusão, upload por planilha, funções, login Supabase, e-mail e WhatsApp

5. Implementar contribuir:
   - QR Code Pix, Pix copia e cola, Pix recorrente, upload de comprovante e histórico

6. Implementar aprovações:
   - aprovação/reprovação/correção de comprovantes
   - lembretes por e-mail e WhatsApp com copy Deep Dive sem constrangimento

7. Implementar permissões por função:
   - cadastro.view/edit
   - contribuintes.view/edit/import
   - contribuir.view/upload_receipt
   - aprovacoes.view/review/send_reminders

8. Manter sistema mobile friendly.

Itens excluídos:
- node_modules
- .next
- .git
- .vercel
- arquivos .env reais
- caches e builds
"@

Set-Content -Path (Join-Path $TempDir "_README_ZIP_CORRENTE_EM_DIA_AREA_LOGADA_V1.txt") -Value $Readme -Encoding UTF8

if (Test-Path $ZipPath) {
  Remove-Item $ZipPath -Force
}

Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $ZipPath -Force
Remove-Item $TempDir -Recurse -Force

Write-Host ""
Write-Host "ZIP gerado com sucesso:"
Write-Host $ZipPath
Write-Host ""