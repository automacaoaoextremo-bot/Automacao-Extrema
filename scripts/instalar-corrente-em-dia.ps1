param(
  [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if (!(Test-Path (Join-Path $ProjectRoot "package.json"))) {
  throw "ProjectRoot inválido. Execute apontando para a raiz do projeto automacao-extrema. Exemplo: -ProjectRoot C:\Users\lacos\Documents\GitHub\automacao-extrema"
}

Write-Host "Projeto:" $ProjectRoot
Write-Host "Pacote:" $PackageRoot

$BackupDir = Join-Path $ProjectRoot ("_backup_corrente_em_dia_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null

$FilesToBackup = @(
  "src/components/admin-page-shell.tsx"
)
foreach ($file in $FilesToBackup) {
  $source = Join-Path $ProjectRoot $file
  if (Test-Path $source) {
    $dest = Join-Path $BackupDir $file
    New-Item -Path (Split-Path $dest -Parent) -ItemType Directory -Force | Out-Null
    Copy-Item $source $dest -Force
  }
}

# Copia arquivos do pacote para o projeto.
$SourceRoot = Join-Path $PackageRoot "project-files"
if (!(Test-Path $SourceRoot)) {
  throw "Pasta project-files não encontrada no pacote."
}

Get-ChildItem -Path $SourceRoot -Recurse -File | ForEach-Object {
  $relative = $_.FullName.Substring($SourceRoot.Length).TrimStart("\", "/")
  $dest = Join-Path $ProjectRoot $relative
  New-Item -Path (Split-Path $dest -Parent) -ItemType Directory -Force | Out-Null
  Copy-Item $_.FullName $dest -Force
  Write-Host "Criado/atualizado:" $relative
}

# Atualiza menu lateral da gestão AE para incluir Corrente em Dia, sem duplicar.
$ShellPath = Join-Path $ProjectRoot "src/components/admin-page-shell.tsx"
if (Test-Path $ShellPath) {
  $content = Get-Content $ShellPath -Raw -Encoding UTF8
  if ($content -notmatch '/admin/ae/corrente-em-dia') {
    $needle = '{ href: "/admin/ae/solucoes", label: "Soluções", group: "Produtos" },'
    $insert = $needle + "`r`n  { href: `"/admin/ae/corrente-em-dia`", label: `"Corrente em Dia`", group: `"Produtos`" },"
    $content = $content.Replace($needle, $insert)
    Set-Content -Path $ShellPath -Value $content -Encoding UTF8
    Write-Host "Menu atualizado: Corrente em Dia incluído."
  } else {
    Write-Host "Menu já possui Corrente em Dia."
  }
}

Write-Host ""
Write-Host "Estrutura Corrente em Dia criada com sucesso."
Write-Host "Próximos passos:"
Write-Host "1) Rode os SQLs em supabase/sql na ordem 01, 02, 03."
Write-Host "2) Execute npm run lint e npm run build."
Write-Host "3) Valide /solucoes/corrente-em-dia, /c/casa-pai-benedito-das-matas e /admin/ae/corrente-em-dia."
Write-Host "Backup parcial criado em:" $BackupDir
