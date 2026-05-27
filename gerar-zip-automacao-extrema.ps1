$ErrorActionPreference = "Stop"

$projectRoot = Get-Location
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputDir = Join-Path $projectRoot "exports"
$tempDir = Join-Path $outputDir "automacao-extrema-envio-$timestamp"
$zipPath = Join-Path $outputDir "automacao-extrema-envio-$timestamp.zip"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$itemsToCopy = @(
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "next.config.mjs",
  "tsconfig.json",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "components.json",
  "src",
  "public"
)

foreach ($item in $itemsToCopy) {
  $source = Join-Path $projectRoot $item

  if (Test-Path $source) {
    $destination = Join-Path $tempDir $item

    if ((Get-Item $source).PSIsContainer) {
      Copy-Item $source $destination -Recurse -Force
    } else {
      New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
      Copy-Item $source $destination -Force
    }
  }
}

$envExamplePath = Join-Path $tempDir ".env.local.example"

@"
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ADMIN_PASSWORD=

NEXT_PUBLIC_SITE_URL=http://localhost:3000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

EMAIL_FROM_NAME=Automação Extrema
EMAIL_FROM=
EMAIL_COPY_TO=automacao.ao.extremo@gmail.com
EMAIL_NOTIFICATIONS_ENABLED=true
"@ | Set-Content -Encoding UTF8 $envExamplePath

$readmePath = Join-Path $tempDir "LEIA-ME-ENVIO.txt"

@"
Zip gerado para revisão da próxima versão da Automação Extrema.

Não inclui:
- node_modules
- .next
- .git
- .env.local

Inclui .env.local.example sem segredos.

Data de geração: $timestamp
"@ | Set-Content -Encoding UTF8 $readmePath

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "ZIP gerado com sucesso:"
Write-Host $zipPath
Write-Host ""