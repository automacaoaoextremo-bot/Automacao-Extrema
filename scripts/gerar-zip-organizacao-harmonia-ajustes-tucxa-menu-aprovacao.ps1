$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\lacos\Documents\GitHub\automacao-extrema"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ZipName = "organizacao-em-harmonia-ajustes-tucxa-menu-aprovacao-$Timestamp.zip"
$OutputZip = Join-Path $ProjectRoot $ZipName
$TempDir = Join-Path $env:TEMP "ae-oh-ajustes-tucxa-$Timestamp"

if (Test-Path $TempDir) {
  Remove-Item $TempDir -Recurse -Force
}

New-Item -ItemType Directory -Path $TempDir | Out-Null

$items = @(
  "src\app\solucoes\organizacao-em-harmonia\tucxa",
  "src\app\solucoes\organizacao-em-harmonia\cliente",
  "src\app\api\organizacao-em-harmonia",
  "src\components\organizacao-em-harmonia",
  "src\lib\organizacao-em-harmonia",
  "src\lib\supabase",
  "src\lib\email",
  "src\lib\mailer",
  "src\types",
  "public\clientes\tucxa",
  "supabase\migrations",
  ".env.example",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
  "eslint.config.mjs",
  "middleware.ts"
)

foreach ($item in $items) {
  $source = Join-Path $ProjectRoot $item

  if (Test-Path $source) {
    $destination = Join-Path $TempDir $item
    $destinationParent = Split-Path $destination -Parent

    if (!(Test-Path $destinationParent)) {
      New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    }

    Copy-Item $source $destination -Recurse -Force
    Write-Host "Incluído: $item"
  }
  else {
    Write-Host "Não encontrado, ignorado: $item" -ForegroundColor Yellow
  }
}

if (Test-Path $OutputZip) {
  Remove-Item $OutputZip -Force
}

Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $OutputZip -Force

Remove-Item $TempDir -Recurse -Force

Write-Host ""
Write-Host "ZIP gerado com sucesso:" -ForegroundColor Green
Write-Host $OutputZip