$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Location).Path
$Stamp = Get-Date -Format "yyyyMMdd-HHmm"
$TempDir = Join-Path $ProjectRoot "_zip_ae_bni_ajustes_$Stamp"
$ZipFile = Join-Path $ProjectRoot "automacao-extrema-ajustes-bni-$Stamp.zip"

if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
if (Test-Path $ZipFile) { Remove-Item $ZipFile -Force }

New-Item -ItemType Directory -Path $TempDir | Out-Null

$RootFiles = @(
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
  "middleware.ts",
  "middleware.js",
  "README.md",
  ".env.example"
)

$RootDirs = @(
  "src",
  "app",
  "components",
  "lib",
  "utils",
  "styles",
  "public"
)

foreach ($file in $RootFiles) {
  if (Test-Path $file) {
    Copy-Item $file (Join-Path $TempDir $file) -Force
  }
}

foreach ($dir in $RootDirs) {
  if (Test-Path $dir) {
    robocopy $dir (Join-Path $TempDir $dir) /E /XD node_modules .next .git .vercel dist build coverage .turbo /XF ".env" ".env.local" "*.log" | Out-Null
    if ($LASTEXITCODE -ge 8) {
      throw "Erro ao copiar $dir"
    }
    $global:LASTEXITCODE = 0
  }
}

Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $ZipFile -Force
Remove-Item $TempDir -Recurse -Force

Write-Host "ZIP gerado:"
Write-Host $ZipFile