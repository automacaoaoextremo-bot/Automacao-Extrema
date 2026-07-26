param(
    [string]$RepoRoot = (Get-Location).Path,
    [string]$OutputZip = ""
)

$ErrorActionPreference = "Stop"

$files = @(
    "src/app/api/organizacao-em-harmonia/filhos-corrente/agendamentos/route.ts",
    "src/app/api/organizacao-em-harmonia/filhos-corrente/perfil/route.ts",
    "src/app/api/organizacao-em-harmonia/filhos-corrente/recepcao-agendamentos/route.ts",
    "src/app/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/confirmar/page.tsx"
)

$repo = (Resolve-Path -LiteralPath $RepoRoot).Path

if (-not (Test-Path -LiteralPath (Join-Path $repo "package.json"))) {
    throw "A pasta informada não parece ser a raiz do projeto: $repo"
}

$missing = @()

foreach ($relativePath in $files) {
    $fullPath = Join-Path $repo $relativePath

    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        $missing += $relativePath
    }
}

if ($missing.Count -gt 0) {
    $message = "Os seguintes arquivos não foram encontrados:`n - " + ($missing -join "`n - ")
    throw $message
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

if ([string]::IsNullOrWhiteSpace($OutputZip)) {
    $OutputZip = Join-Path $repo "oeh-arquivos-lint-$timestamp.zip"
} elseif (-not [System.IO.Path]::IsPathRooted($OutputZip)) {
    $OutputZip = Join-Path $repo $OutputZip
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) "oeh-arquivos-lint-$timestamp"

try {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

    foreach ($relativePath in $files) {
        $source = Join-Path $repo $relativePath
        $destination = Join-Path $tempRoot $relativePath
        $destinationDirectory = Split-Path -Parent $destination

        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
        Copy-Item -LiteralPath $source -Destination $destination -Force
    }

    $branch = ""
    $commit = ""
    $status = ""

    try {
        $branch = (git -C $repo branch --show-current 2>$null | Out-String).Trim()
    } catch {
        $branch = "Não foi possível identificar"
    }

    try {
        $commit = (git -C $repo rev-parse HEAD 2>$null | Out-String).Trim()
    } catch {
        $commit = "Não foi possível identificar"
    }

    try {
        $status = (git -C $repo status --short 2>$null | Out-String).TrimEnd()
    } catch {
        $status = "Não foi possível identificar"
    }

    $manifest = @"
Coleta dos arquivos relacionados ao npm run lint
Data: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
Repositório: $repo
Branch: $branch
Commit: $commit

Arquivos incluídos:
$($files | ForEach-Object { "- $_" } | Out-String)

Git status --short:
$status

Observação:
O script anterior pode ter alterado os três arquivos de API antes de falhar.
Este ZIP contém exatamente as versões que estão atualmente no repositório.
"@

    Set-Content `
        -LiteralPath (Join-Path $tempRoot "MANIFESTO.txt") `
        -Value $manifest `
        -Encoding UTF8

    if (Test-Path -LiteralPath $OutputZip) {
        Remove-Item -LiteralPath $OutputZip -Force
    }

    Compress-Archive `
        -Path (Join-Path $tempRoot "*") `
        -DestinationPath $OutputZip `
        -CompressionLevel Optimal `
        -Force

    Write-Host ""
    Write-Host "ZIP gerado com sucesso:" -ForegroundColor Green
    Write-Host $OutputZip -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Arquivos incluídos:" -ForegroundColor Green

    foreach ($relativePath in $files) {
        Write-Host " - $relativePath"
    }

    Write-Host ""
    Write-Host "Anexe esse ZIP na conversa para que os quatro arquivos completos sejam corrigidos." -ForegroundColor Yellow
}
finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
