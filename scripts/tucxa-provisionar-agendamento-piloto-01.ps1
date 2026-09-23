[CmdletBinding()]
param(
    [string]$RepoRoot = "C:\Users\lacos\Documents\GitHub\automacao-extrema",
    [string]$SeedFile = "C:\Users\lacos\Documents\scripts\tucxa-agendamento-piloto-01-acessos.local.json"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
    throw "Repositorio nao encontrado: $RepoRoot"
}
if (-not (Test-Path -LiteralPath $SeedFile -PathType Leaf)) {
    throw "Arquivo local de acessos nao encontrado: $SeedFile"
}

$secure = Read-Host "Digite a senha temporaria para os NOVOS logins do piloto" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$plain = $null

try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    if ([string]::IsNullOrWhiteSpace($plain) -or $plain.Length -lt 8) {
        throw "A senha temporaria precisa ter pelo menos 8 caracteres."
    }

    $env:TUCXA_PILOT_TEMP_PASSWORD = $plain
    $env:TUCXA_PILOT_SEED_FILE = $SeedFile

    Push-Location $RepoRoot
    try {
        node ".\scripts\tucxa-provisionar-agendamento-piloto-01.mjs"
        if ($LASTEXITCODE -ne 0) {
            throw "O provisionamento terminou com erro. Revise as mensagens acima."
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    Remove-Item Env:TUCXA_PILOT_TEMP_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:TUCXA_PILOT_SEED_FILE -ErrorAction SilentlyContinue
    if ($ptr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
    $plain = $null
}
