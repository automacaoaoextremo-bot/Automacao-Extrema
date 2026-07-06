# Gera um pacote somente com os arquivos alterados/novos deste ajuste.
# Execute na raiz do repositório automacao-extrema.

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "ae-presenca-querida-recados-daniela-aprovacao-lp-$timestamp"
$outDir = Join-Path (Get-Location) $packageName
$zipPath = Join-Path (Get-Location) "$packageName.zip"

$files = @(
  ".env.example",
  "MANIFESTO_DO_PACOTE.txt",
  "PASSO_A_PASSO_ATUALIZACAO.md",
  "scripts/gerar-zip-presenca-recados-daniela.ps1",
  "src/components/presenca-public-confirmation.tsx",
  "src/app/api/presenca-querida/confirmar/[token]/route.ts",
  "src/app/api/presenca-querida/cliente/messages/route.ts",
  "src/app/solucoes/presenca-querida/evento/[slug]/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/mensagens/page.tsx",
  "src/lib/mail.ts",
  "src/lib/presenca-daniela50.ts",
  "supabase/sql/20260702_17_presenca_querida_recados_daniela_aprovacao_lp.sql"
)

if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
New-Item -ItemType Directory -Path $outDir | Out-Null

foreach ($file in $files) {
  if (!(Test-Path $file)) {
    Write-Warning "Arquivo não encontrado e ignorado: $file"
    continue
  }

  $dest = Join-Path $outDir $file
  $destDir = Split-Path $dest -Parent
  if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
  Copy-Item $file $dest -Force
}

Compress-Archive -Path (Join-Path $outDir "*") -DestinationPath $zipPath -Force
Write-Host "Pacote gerado: $zipPath"
