$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Location).Path
$Stamp = Get-Date -Format "yyyyMMdd-HHmm"
$TempDir = Join-Path $ProjectRoot "_zip_ae_home_ajustes_$Stamp"
$ZipFile = Join-Path $ProjectRoot "automacao-extrema-ajustes-home-$Stamp.zip"

Write-Host "Gerando ZIP para ajustes da home da Automação Extrema..."
Write-Host "Raiz do projeto: $ProjectRoot"

if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}

if (Test-Path $ZipFile) {
    Remove-Item $ZipFile -Force
}

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
    "jsconfig.json",
    "tailwind.config.js",
    "tailwind.config.ts",
    "postcss.config.js",
    "postcss.config.mjs",
    "eslint.config.js",
    "eslint.config.mjs",
    ".eslintrc.json",
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
    $source = Join-Path $ProjectRoot $file

    if (Test-Path $source) {
        $destination = Join-Path $TempDir $file
        New-Item -ItemType Directory -Path (Split-Path $destination) -Force | Out-Null
        Copy-Item $source $destination -Force
        Write-Host "Incluído arquivo: $file"
    }
}

foreach ($dir in $RootDirs) {
    $source = Join-Path $ProjectRoot $dir

    if (Test-Path $source) {
        $destination = Join-Path $TempDir $dir
        Write-Host "Incluindo pasta: $dir"

        robocopy $source $destination /E `
            /XD node_modules .next .git .vercel dist build coverage .turbo `
            /XF ".env" ".env.local" ".env.*" "*.log" `
            /R:2 /W:1 | Out-Null

        if ($LASTEXITCODE -ge 8) {
            throw "Erro ao copiar a pasta $dir com robocopy. Código: $LASTEXITCODE"
        }

        $global:LASTEXITCODE = 0
    }
}

$ManifestFile = Join-Path $TempDir "_manifesto_arquivos_incluidos.txt"

Get-ChildItem $TempDir -Recurse -File |
    ForEach-Object {
        $_.FullName.Replace($TempDir + "\", "")
    } |
    Sort-Object |
    Out-File $ManifestFile -Encoding UTF8

Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $ZipFile -Force

Remove-Item $TempDir -Recurse -Force

Write-Host ""
Write-Host "ZIP gerado com sucesso:"
Write-Host $ZipFile
Write-Host ""
Write-Host "Envie este arquivo aqui no chat."