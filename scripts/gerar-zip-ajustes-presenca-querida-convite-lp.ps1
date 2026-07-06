# gerar-zip-ajustes-presenca-querida-convite-lp.ps1
# Gera um ZIP com a última versão dos arquivos necessários para ajustar:
# - WhatsApp curto
# - confirmação diretamente na landing page do evento
# - fim/redução da página intermediária de confirmação
# - Deep Dive nos textos de confirmação/lembretes
# - convidados individuais ou vinculados ao responsável
# - relação/parentesco/origem do relacionamento nas mensagens personalizadas

param(
  [string]$RepoRoot = ".",
  [string]$OutDir = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-AeLog {
  param([string]$Message)
  Write-Host "[AE] $Message"
}

function Resolve-FullPath {
  param([string]$PathValue)
  return [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $PathValue).Path)
}

function New-CleanDirectory {
  param([string]$PathValue)
  if (Test-Path -LiteralPath $PathValue) {
    Remove-Item -LiteralPath $PathValue -Recurse -Force
  }
  New-Item -ItemType Directory -Path $PathValue -Force | Out-Null
}

function Should-SkipPath {
  param([string]$FullName)

  $normalized = $FullName -replace '/', '\'

  $skipPatterns = @(
    '\node_modules\',
    '\.next\',
    '\.vercel\',
    '\.git\',
    '\dist\',
    '\build\',
    '\coverage\',
    '\.turbo\'
  )

  foreach ($pattern in $skipPatterns) {
    if ($normalized.Contains($pattern)) {
      return $true
    }
  }

  $fileName = [System.IO.Path]::GetFileName($FullName)

  if ($fileName -eq ".env") { return $true }
  if ($fileName -eq ".env.local") { return $true }
  if ($fileName -eq ".env.production") { return $true }
  if ($fileName -eq ".env.development") { return $true }

  return $false
}

function Copy-RelativeItem {
  param(
    [string]$RelativePath,
    [string]$SourceRoot,
    [string]$DestinationRoot
  )

  $cleanRelativePath = $RelativePath.Trim() -replace '^[\\/]+', ''
  if ([string]::IsNullOrWhiteSpace($cleanRelativePath)) {
    return
  }

  $sourcePath = Join-Path $SourceRoot $cleanRelativePath

  if (-not (Test-Path -LiteralPath $sourcePath)) {
    Write-AeLog "Ignorando ausente: $cleanRelativePath"
    return
  }

  $item = Get-Item -LiteralPath $sourcePath -Force

  if ($item.PSIsContainer) {
    Write-AeLog "Copiando pasta: $cleanRelativePath"

    $files = Get-ChildItem -LiteralPath $sourcePath -Recurse -Force -File
    foreach ($file in $files) {
      if (Should-SkipPath -FullName $file.FullName) {
        continue
      }

      $subPath = $file.FullName.Substring($sourcePath.Length) -replace '^[\\/]+', ''
      $destBase = Join-Path $DestinationRoot $cleanRelativePath
      $destFile = Join-Path $destBase $subPath
      $destFolder = Split-Path -Parent $destFile

      if (-not (Test-Path -LiteralPath $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
      }

      Copy-Item -LiteralPath $file.FullName -Destination $destFile -Force
    }
  } else {
    if (Should-SkipPath -FullName $item.FullName) {
      Write-AeLog "Ignorando sensível/temporário: $cleanRelativePath"
      return
    }

    Write-AeLog "Copiando arquivo: $cleanRelativePath"

    $destFile = Join-Path $DestinationRoot $cleanRelativePath
    $destFolder = Split-Path -Parent $destFile

    if (-not (Test-Path -LiteralPath $destFolder)) {
      New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
    }

    Copy-Item -LiteralPath $sourcePath -Destination $destFile -Force
  }
}

$repoRootResolved = Resolve-FullPath -PathValue $RepoRoot

if (-not (Test-Path -LiteralPath $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}
$outDirResolved = Resolve-FullPath -PathValue $OutDir

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$workRoot = Join-Path $env:TEMP "ae-presenca-querida-convite-lp-$timestamp"
$zipPath = Join-Path $outDirResolved "ae-presenca-querida-ajustes-convite-lp-$timestamp.zip"

Write-AeLog "Preparando pasta temporaria..."
New-CleanDirectory -PathValue $workRoot

$itemsToInclude = @(
  # Configuracao minima do projeto
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

  # Presenca Querida - paginas publicas, area logada e confirmacao
  "src/app/solucoes/presenca-querida",
  "src/app/api/presenca-querida",

  # Componentes diretamente usados pelo Presenca Querida
  "src/components/presenca-client-header.tsx",
  "src/components",

  # Libs necessarias para Supabase, autenticacao, convite, mensagem, e-mail e BotConversa
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
  "src/lib",

  # Tipos, config e estilos compartilhados
  "src/types",
  "src/config",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/globals.css",
  "src/app/solucoes/page.tsx",
  "src/app/solucoes/layout.tsx",

  # Assets do evento e da solucao
  "public/presenca-querida",
  "public/solucoes",
  "public/ae",
  "public/logo",
  "public/logos",

  # SQLs necessarios para ajustar modelo de dados, convidados vinculados e mensagens
  "supabase/sql",
  "sql",
  "prisma"
)

Write-AeLog "Copiando arquivos necessarios..."
foreach ($relative in $itemsToInclude) {
  Copy-RelativeItem -RelativePath $relative -SourceRoot $repoRootResolved -DestinationRoot $workRoot
}

Write-AeLog "Gerando manifesto..."
$manifestPath = Join-Path $workRoot "MANIFESTO_AJUSTES_PRESENCA_QUERIDA_CONVITE_LP.txt"
@"
Pacote para ajustes do Presenca Querida

Objetivo:
- Reduzir mensagem de WhatsApp, deixando detalhes completos na landing page do evento.
- Eliminar ou reduzir pagina intermediaria de confirmacao.
- Colocar botoes de confirmacao diretamente na LP do evento quando acessada via token.
- Aplicar Deep Dive para reforcar a importancia da confirmacao sem parecer cobranca.
- Ajustar regra de convidados individuais e convidados vinculados ao responsavel.
- Remover botao generico "Sim, vou com acompanhantes".
- Personalizar mensagem conforme parentesco ou origem do relacionamento com Daniela.
- Preparar lembretes para confirmados, talvez e pendentes ate 30/11/2026.

Gerado em:
$timestamp

Raiz do projeto:
$repoRootResolved
"@ | Set-Content -LiteralPath $manifestPath -Encoding UTF8

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Write-AeLog "Compactando ZIP..."
Compress-Archive -Path (Join-Path $workRoot "*") -DestinationPath $zipPath -Force

Write-AeLog "ZIP criado com sucesso:"
Write-Host $zipPath

Write-AeLog "Tamanho:"
$zipItem = Get-Item -LiteralPath $zipPath
"{0:N2} MB" -f ($zipItem.Length / 1MB)

Write-AeLog "Pronto. Anexe este ZIP no chat."
