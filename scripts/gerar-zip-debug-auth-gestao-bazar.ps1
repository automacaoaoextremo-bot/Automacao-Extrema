$ErrorActionPreference = "Stop"

$ProjectRoot = Get-Location
$ZipName = "ae-bazar-debug-auth-gestao.zip"
$TempDir = Join-Path $env:TEMP "ae-bazar-debug-auth-gestao"

if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}

New-Item -ItemType Directory -Path $TempDir | Out-Null

$IncludePaths = @(
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    ".env.example",

    "src/app/bazar-sementinha/gestao/gestao-client.tsx",
    "src/app/bazar-sementinha/login/login-client.tsx",

    "src/app/api/bazar-sementinha/auth/route.ts",
    "src/app/api/bazar-sementinha/config/route.ts",
    "src/app/api/bazar-sementinha/orders/route.ts",
    "src/app/api/bazar-sementinha/bootstrap/route.ts",

    "src/lib/bazar-sementinha.ts",
    "src/lib/supabase-admin.ts",
    "src/lib/supabase-browser.ts",

    "supabase/sql/20260620_bazar_no_controle_sementinha.sql"
)

foreach ($Path in $IncludePaths) {
    $Source = Join-Path $ProjectRoot $Path

    if (Test-Path $Source) {
        $Destination = Join-Path $TempDir $Path
        $DestinationParent = Split-Path $Destination -Parent

        if (!(Test-Path $DestinationParent)) {
            New-Item -ItemType Directory -Path $DestinationParent -Force | Out-Null
        }

        Copy-Item $Source $Destination -Recurse -Force
    }
    else {
        Write-Host "Aviso: não encontrado -> $Path" -ForegroundColor Yellow
    }
}

$SqlDir = Join-Path $ProjectRoot "supabase/sql"

if (Test-Path $SqlDir) {
    Get-ChildItem $SqlDir -File | Where-Object {
        $_.Name -like "*bazar*" -or
        $_.Name -like "*sementinha*" -or
        $_.Name -like "*auth*" -or
        $_.Name -like "*policy*" -or
        $_.Name -like "*rls*"
    } | ForEach-Object {
        $RelativePath = "supabase/sql/$($_.Name)"
        $Destination = Join-Path $TempDir $RelativePath
        $DestinationParent = Split-Path $Destination -Parent

        if (!(Test-Path $DestinationParent)) {
            New-Item -ItemType Directory -Path $DestinationParent -Force | Out-Null
        }

        Copy-Item $_.FullName $Destination -Force
    }
}

$ZipPath = Join-Path $ProjectRoot $ZipName

if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}

Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $ZipPath -Force

Remove-Item $TempDir -Recurse -Force

Write-Host ""
Write-Host "ZIP gerado com sucesso:" -ForegroundColor Green
Write-Host $ZipPath -ForegroundColor Cyan
Write-Host ""
Write-Host "Envie este arquivo aqui no chat:" -ForegroundColor Yellow
Write-Host $ZipName -ForegroundColor Cyan