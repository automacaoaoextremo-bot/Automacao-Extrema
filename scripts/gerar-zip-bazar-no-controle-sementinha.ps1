$ErrorActionPreference = "Stop"
$ZipName = "ae-bazar-no-controle-sementinha-atualizado.zip"
$Root = Get-Location
$Temp = Join-Path $env:TEMP "ae-bazar-no-controle-sementinha-atualizado"
if (Test-Path $Temp) { Remove-Item $Temp -Recurse -Force }
New-Item -ItemType Directory -Path $Temp | Out-Null
$paths = @("package.json","package-lock.json","next.config.ts","tsconfig.json","eslint.config.mjs","postcss.config.mjs","README.md",".env.example","src","public","supabase","scripts","docs")
foreach ($p in $paths) {
  $src = Join-Path $Root $p
  if (Test-Path $src) {
    $dst = Join-Path $Temp $p
    $parent = Split-Path $dst -Parent
    if (!(Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    Copy-Item $src $dst -Recurse -Force
  }
}
Get-ChildItem $Temp -Directory -Recurse -Force | Where-Object { $_.Name -in @("node_modules",".next",".git","dist","build","coverage") } | ForEach-Object { Remove-Item $_.FullName -Recurse -Force }
Get-ChildItem $Temp -File -Recurse -Force | Where-Object { $_.Name -in @(".env.local",".env","tsconfig.tsbuildinfo") } | ForEach-Object { Remove-Item $_.FullName -Force }
$ZipPath = Join-Path $Root $ZipName
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path (Join-Path $Temp "*") -DestinationPath $ZipPath -Force
Remove-Item $Temp -Recurse -Force
Write-Host "ZIP gerado: $ZipPath" -ForegroundColor Green
