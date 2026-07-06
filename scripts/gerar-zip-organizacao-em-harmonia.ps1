$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\lacos\Documents\GitHub\automacao-extrema"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipName = "ae-organizacao-em-harmonia-ajustes-$timestamp.zip"
$zipPath = Join-Path $projectRoot $zipName

$pathsToInclude = @(
    "src\app\solucoes\organizacao-em-harmonia",
    "src\app\solucoes\corrente-em-dia",
    "src\app\solucoes\atendimento-em-harmonia",
    "src\app\solucoes\agenda-viva",
    "src\app\api\organizacao-em-harmonia",
    "src\components",
    "src\lib",
    "public",
    "docs"
)

$existingPaths = @()

foreach ($relativePath in $pathsToInclude) {
    $fullPath = Join-Path $projectRoot $relativePath
    if (Test-Path $fullPath) {
        $existingPaths += $fullPath
    } else {
        Write-Host "Aviso: caminho não encontrado -> $relativePath" -ForegroundColor Yellow
    }
}

if ($existingPaths.Count -eq 0) {
    throw "Nenhum caminho válido foi encontrado para compactar."
}

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path $existingPaths -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "ZIP gerado com sucesso:" -ForegroundColor Green
Write-Host $zipPath -ForegroundColor Cyan