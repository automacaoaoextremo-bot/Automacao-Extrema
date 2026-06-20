$ErrorActionPreference = "Stop"

$ProjectRoot = Get-Location
$ZipName = "ae-bazar-no-controle-sementinha-ultima-versao.zip"
$TempDir = Join-Path $env:TEMP "ae-bazar-no-controle-sementinha-zip"

if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}

New-Item -ItemType Directory -Path $TempDir | Out-Null

$IncludePaths = @(
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "eslint.config.mjs",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "README.md",
    ".env.example",
    "src",
    "public",
    "supabase",
    "scripts",
    "prisma",
    "database",
    "docs",
    "middleware.ts"
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
}

$ExcludeDirs = @(
    "node_modules",
    ".next",
    ".git",
    "dist",
    "build",
    "coverage"
)

foreach ($Dir in $ExcludeDirs) {
    Get-ChildItem $TempDir -Directory -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq $Dir } |
        ForEach-Object { Remove-Item $_.FullName -Recurse -Force }
}

$ExcludeFiles = @(
    ".env.local",
    ".env",
    "tsconfig.tsbuildinfo"
)

foreach ($File in $ExcludeFiles) {
    Get-ChildItem $TempDir -File -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq $File } |
        ForEach-Object { Remove-Item $_.FullName -Force }
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