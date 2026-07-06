param(
  [string]$RepoRoot = ".",
  [string]$OutDir = "."
)

$ErrorActionPreference = "Stop"

function Write-AE($Message) {
  Write-Host "[AE] $Message"
}

function Resolve-FullPath([string]$PathValue) {
  $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($PathValue)
}

function Should-SkipPath {
  param([string]$FullName)

  $normalized = $FullName -replace '\\', '/'
  $skipFragments = @('/node_modules/','/.next/','/.git/','/.vercel/','/dist/','/build/','/coverage/','/.turbo/','/tmp/','/.cache/')

  foreach ($fragment in $skipFragments) {
    if ($normalized.Contains($fragment)) { return $true }
  }

  $fileName = [System.IO.Path]::GetFileName($FullName)
  if ($fileName -match '^\.env') { return $true }

  return $false
}

function Copy-DirectoryFiltered {
  param(
    [Parameter(Mandatory=$true)][string]$SourceDir,
    [Parameter(Mandatory=$true)][string]$TargetDir
  )

  if (-not (Test-Path -LiteralPath $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
  }

  $sourceRootResolved = Resolve-FullPath $SourceDir

  Get-ChildItem -LiteralPath $SourceDir -Recurse -Force | ForEach-Object {
    if (Should-SkipPath $_.FullName) { return }

    $subPath = $_.FullName.Substring($sourceRootResolved.Length) -replace '^[\\/]+', ''
    $dest = Join-Path $TargetDir $subPath

    if ($_.PSIsContainer) {
      if (-not (Test-Path -LiteralPath $dest)) {
        New-Item -ItemType Directory -Path $dest -Force | Out-Null
      }
    } else {
      $destParent = Split-Path -Parent $dest
      if ($destParent -and -not (Test-Path -LiteralPath $destParent)) {
        New-Item -ItemType Directory -Path $destParent -Force | Out-Null
      }
      Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
    }
  }
}

function Copy-ItemSafe {
  param(
    [Parameter(Mandatory=$true)][string]$RelativePath,
    [Parameter(Mandatory=$true)][string]$SourceRoot,
    [Parameter(Mandatory=$true)][string]$TargetRoot
  )

  $cleanRelative = ($RelativePath.Trim() -replace '^[\\/]+', '')
  $source = Join-Path $SourceRoot $cleanRelative
  $target = Join-Path $TargetRoot $cleanRelative

  if (-not (Test-Path -LiteralPath $source)) {
    Write-AE "Aviso: não encontrado, ignorando: $cleanRelative"
    return
  }

  $targetParent = Split-Path -Parent $target
  if ($targetParent -and -not (Test-Path -LiteralPath $targetParent)) {
    New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
  }

  if ((Get-Item -LiteralPath $source).PSIsContainer) {
    Copy-DirectoryFiltered -SourceDir $source -TargetDir $target
  } else {
    Copy-Item -LiteralPath $source -Destination $target -Force
  }
}

function New-ZipRobust {
  param(
    [Parameter(Mandatory=$true)][string]$SourceDir,
    [Parameter(Mandatory=$true)][string]$ZipPath
  )

  if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
  }

  $sourceFull = Resolve-FullPath $SourceDir
  $zipParent = Resolve-FullPath (Split-Path -Parent $ZipPath)
  $zipFull = Join-Path $zipParent ([System.IO.Path]::GetFileName($ZipPath))

  Write-AE "Tentando compactar com .NET ZipFile..."
  try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($sourceFull, $zipFull)
  } catch {
    Write-AE "Falha no .NET ZipFile: $($_.Exception.Message)"
  }

  if (Test-Path -LiteralPath $zipFull) { return $zipFull }

  Write-AE "Tentando compactar com tar.exe..."
  try {
    $parent = Split-Path -Parent $sourceFull
    $leaf = Split-Path -Leaf $sourceFull
    Push-Location $parent
    tar.exe -a -cf $zipFull $leaf
    Pop-Location
  } catch {
    try { Pop-Location } catch {}
    Write-AE "Falha no tar.exe: $($_.Exception.Message)"
  }

  if (Test-Path -LiteralPath $zipFull) { return $zipFull }

  Write-AE "Tentando compactar com Compress-Archive..."
  try {
    Compress-Archive -Path (Join-Path $sourceFull "*") -DestinationPath $zipFull -Force
  } catch {
    Write-AE "Falha no Compress-Archive: $($_.Exception.Message)"
  }

  if (Test-Path -LiteralPath $zipFull) { return $zipFull }

  throw "Não foi possível gerar o ZIP em: $zipFull"
}

$repo = Resolve-FullPath $RepoRoot
$out = Resolve-FullPath $OutDir

if (-not (Test-Path -LiteralPath $repo)) {
  throw "RepoRoot não encontrado: $repo"
}

if (-not (Test-Path -LiteralPath $out)) {
  New-Item -ItemType Directory -Path $out -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "ae-presenca-querida-ajustes-obrigado-email-lembretes-$timestamp"
$tempRoot = Join-Path $env:TEMP $packageName

if (Test-Path -LiteralPath $tempRoot) {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

Write-AE "Preparando pacote em: $tempRoot"
Write-AE "Copiando arquivos necessários para página de obrigado, e-mail de respostas, lembretes e ajustes visuais da LP..."

$paths = @(
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
  "tsconfig.json",
  "eslint.config.mjs",
  "eslint.config.js",
  "postcss.config.mjs",
  "postcss.config.js",
  ".env.example",
  "README.md",

  "src/app/solucoes/presenca-querida/page.tsx",
  "src/app/solucoes/presenca-querida/evento/[slug]/page.tsx",
  "src/app/solucoes/presenca-querida/evento/[slug]/obrigado/page.tsx",
  "src/app/solucoes/presenca-querida/confirmar/[token]/page.tsx",
  "src/app/solucoes/presenca-querida/obrigado/page.tsx",

  "src/app/solucoes/presenca-querida/cliente/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/convidados/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/mensagens/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/confirmacoes/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/relatorios/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/cadastro/page.tsx",
  "src/app/solucoes/presenca-querida/cliente/primeiros-passos/page.tsx",
  "src/app/solucoes/presenca-querida/login/page.tsx",
  "src/app/solucoes/presenca-querida/quero-conhecer/page.tsx",

  "src/app/api/presenca-querida/confirmar/[token]/route.ts",
  "src/app/api/presenca-querida/eventos/[slug]/route.ts",
  "src/app/api/presenca-querida/cliente/event/route.ts",
  "src/app/api/presenca-querida/cliente/guests/route.ts",
  "src/app/api/presenca-querida/cliente/messages/route.ts",
  "src/app/api/presenca-querida/cliente/messages/generate-invitations/route.ts",
  "src/app/api/presenca-querida/cliente/dashboard/route.ts",
  "src/app/api/presenca-querida/cliente/onboarding/route.ts",

  "src/app/api/cron/presenca-querida-reminders/route.ts",
  "src/app/api/cron/presenca-querida-lembretes/route.ts",
  "src/app/api/cron/followup-alerts/route.ts",
  "src/app/api/cron/corrente-em-dia-lead-alerts/route.ts",

  "src/lib/presenca-daniela50.ts",
  "src/lib/presenca-querida.ts",
  "src/lib/presenca-auth.ts",
  "src/lib/supabase-admin.ts",
  "src/lib/botconversa.ts",
  "src/lib/email.ts",
  "src/lib/mailer.ts",
  "src/lib/notifications.ts",
  "src/lib/resend.ts",
  "src/lib/sendgrid.ts",
  "src/components/presenca-public-confirmation.tsx",
  "src/components/presenca-client-header.tsx",
  "src/components/presenca-contextual-help.tsx",
  "src/components/presenca-onboarding-checklist.tsx",
  "src/components/ae-solution-header.tsx",
  "src/components/site-header.tsx",

  "src/app/layout.tsx",
  "src/app/globals.css",
  "public/presenca-querida",
  "supabase/sql"
)

foreach ($path in $paths) {
  Copy-ItemSafe -RelativePath $path -SourceRoot $repo -TargetRoot $tempRoot
}

$manifest = @"
Pacote: $packageName
Gerado em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
RepoRoot: $repo

Objetivo dos ajustes:
1. Reduzir proporcionalmente o tamanho das letras em toda a LP pública do evento.
2. Criar página de obrigado personalizada e persuasiva após o registro da resposta.
3. Após confirmar, orientar que imprevistos devem ser avisados quanto antes.
4. Ao reabrir o link, mostrar claramente o status atual do convidado e permitir alterar a resposta na própria página.
5. Enviar e-mail para automacao.ao.extremo@gmail.com sempre que houver resposta/alteração de convidado.
6. Incluir programação de lembretes:
   Confirmados:
   - 12/12/2026: lembrete com local, horário, mapa e clima da festa
   - 18/12/2026: lembrete final curto
   Talvez:
   - 05/11/2026: lembrete gentil
   - 12/11/2026: último lembrete antes do fechamento
   - 19/11/2026: prazo final
   Pendentes:
   - 01/11/2026: primeiro lembrete
   - 10/11/2026: segundo lembrete
   - 18/11/2026: aviso de fechamento
   - 19/11/2026: prazo final
7. Criar/ajustar rotina para avisar por e-mail com 2 dias de antecedência quais convidados precisam ser acionados.
"@

Set-Content -Path (Join-Path $tempRoot "MANIFESTO_DO_PACOTE.txt") -Value $manifest -Encoding UTF8

$zipPath = Join-Path $out "$packageName.zip"
$finalZip = New-ZipRobust -SourceDir $tempRoot -ZipPath $zipPath

if (-not (Test-Path -LiteralPath $finalZip)) {
  throw "O ZIP não foi encontrado após a geração: $finalZip"
}

$sizeMb = [math]::Round((Get-Item -LiteralPath $finalZip).Length / 1MB, 2)
Write-AE "Pacote gerado com sucesso."
Write-Host ""
Write-Host "Arquivo para anexar no ChatGPT:"
Write-Host $finalZip
Write-Host ""
Write-Host "Tamanho: $sizeMb MB"

try {
  Set-Clipboard -Value $finalZip
  Write-AE "Caminho copiado para a área de transferência."
} catch {
  Write-AE "Não foi possível copiar para a área de transferência."
}

try {
  explorer.exe /select,"$finalZip"
} catch {
  Write-AE "Não foi possível abrir o Explorer automaticamente."
}
