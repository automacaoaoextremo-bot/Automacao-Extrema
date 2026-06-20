$ErrorActionPreference = "Stop"

$ProjectRoot = Get-Location
$ZipName = "ae-bazar-no-controle-ajustes-2-corrigido.zip"
$TempDir = Join-Path $env:TEMP "ae-bazar-no-controle-ajustes-2-corrigido"

if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path $TempDir | Out-Null

$IncludePaths = @(
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "eslint.config.mjs",
    "postcss.config.mjs",
    ".env.example",
    "README.md",
    "vercel.json",
    ".yarnrc",
    "src/app/globals.css",
    "src/app/bazar-sementinha/page.tsx",
    "src/app/bazar-sementinha/pedidos/page.tsx",
    "src/app/bazar-sementinha/pedidos/pedidos-client.tsx",
    "src/app/bazar-sementinha/caixa/page.tsx",
    "src/app/bazar-sementinha/caixa/caixa-client.tsx",
    "src/app/bazar-sementinha/gestao/page.tsx",
    "src/app/bazar-sementinha/gestao/gestao-client.tsx",
    "src/app/bazar-sementinha/login/page.tsx",
    "src/app/bazar-sementinha/login/login-client.tsx",
    "src/app/bazar-sementinha/prestacao-contas/page.tsx",
    "src/app/bazar-sementinha/prestacao-contas/prestacao-client.tsx",
    "src/app/api/bazar-sementinha",
    "src/components/bazar-sementinha",
    "src/components/admin-guard.tsx",
    "src/components/site-header.tsx",
    "src/components/ae-solution-header.tsx",
    "src/lib/bazar-sementinha.ts",
    "src/lib/supabase-admin.ts",
    "src/lib/supabase-browser.ts",
    "src/lib/admin-auth.ts",
    "supabase/sql/20260620_bazar_no_controle_sementinha.sql",
    "public/bazar-no-controle-logo.svg",
    "public/sementinha-logo.jpg",
    "public/ae-logo-horizontal.png",
    "public/ae-logo-azul.png",
    "docs/PASSO_A_PASSO_AJUSTES_2_BAZAR_NO_CONTROLE.md",
    "scripts/gerar-zip-bazar-no-controle-ajustes-2-corrigido.ps1"
)

foreach ($Path in $IncludePaths) {
    $Source = Join-Path $ProjectRoot $Path
    if (Test-Path $Source) {
        $Destination = Join-Path $TempDir $Path
        $DestinationParent = Split-Path $Destination -Parent
        if (!(Test-Path $DestinationParent)) { New-Item -ItemType Directory -Path $DestinationParent -Force | Out-Null }
        Copy-Item $Source $Destination -Recurse -Force
    } else {
        Write-Host "Aviso: não encontrado -> $Path" -ForegroundColor Yellow
    }
}

$ZipPath = Join-Path $ProjectRoot $ZipName
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $ZipPath -Force
Remove-Item $TempDir -Recurse -Force

Write-Host "ZIP gerado com sucesso: $ZipPath" -ForegroundColor Green
