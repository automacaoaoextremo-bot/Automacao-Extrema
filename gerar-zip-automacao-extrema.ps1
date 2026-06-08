$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$ProjectName = "automacao-extrema"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$ZipName = "$ProjectName-ajustes-presenca-querida-$Timestamp.zip"
$ZipPath = Join-Path $Root $ZipName
$TempDir = Join-Path $env:TEMP "$ProjectName-zip-$Timestamp"

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

$AllowedEnvFiles = @(
  ".env.example",
  ".env.local.example"
)

if (Test-Path $TempDir) {
  Remove-Item $TempDir -Recurse -Force
}

New-Item -Path $TempDir -ItemType Directory | Out-Null

Get-ChildItem -Path $Root -Recurse -File -Force | Where-Object {
  $RelativePath = $_.FullName.Substring($Root.Length).TrimStart("\", "/")
  $Parts = $RelativePath -split "[\\/]"
  $FileName = $_.Name

  $IsInsideExcludedDir = $false
  foreach ($Part in $Parts) {
    if ($ExcludeDirs -contains $Part) {
      $IsInsideExcludedDir = $true
      break
    }
  }

  if ($IsInsideExcludedDir) {
    return $false
  }

  if ($ExcludeFiles -contains $FileName) {
    return $false
  }

  if ($FileName -like ".env*" -and $AllowedEnvFiles -notcontains $FileName) {
    return $false
  }

  if ($RelativePath -eq $ZipName) {
    return $false
  }

  return $true
} | ForEach-Object {
  $RelativePath = $_.FullName.Substring($Root.Length).TrimStart("\", "/")
  $Destination = Join-Path $TempDir $RelativePath
  $DestinationFolder = Split-Path $Destination -Parent

  New-Item -Path $DestinationFolder -ItemType Directory -Force | Out-Null
  Copy-Item $_.FullName $Destination -Force
}

$IncludedFilesReport = Join-Path $TempDir "_ARQUIVOS_INCLUIDOS.txt"

Get-ChildItem -Path $TempDir -Recurse -File | ForEach-Object {
  $_.FullName.Substring($TempDir.Length).TrimStart("\", "/")
} | Sort-Object | Set-Content -Path $IncludedFilesReport -Encoding UTF8

$Report = @"
Projeto: $ProjectName
Gerado em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Origem: $Root

Objetivo:
Enviar a versão atual do projeto Automação Extrema para ajustes da gestão multi-solução,
incluindo Presença Querida, cadastros de públicos alvo, dores, funcionalidades, parceiros,
comissões e sites/páginas de clientes.

Itens propositalmente NÃO incluídos:
- node_modules
- .next
- .git
- .vercel
- arquivos .env reais
- caches e builds gerados

Observação:
Enviar somente .env.example, sem chaves reais do Supabase, Vercel, Gmail ou APIs.
"@

Set-Content -Path (Join-Path $TempDir "_RELATORIO_DO_ZIP.txt") -Value $Report -Encoding UTF8

if (Test-Path $ZipPath) {
  Remove-Item $ZipPath -Force
}

Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $ZipPath -Force
Remove-Item $TempDir -Recurse -Force

Write-Host ""
Write-Host "ZIP gerado com sucesso:"
Write-Host $ZipPath
Write-Host ""