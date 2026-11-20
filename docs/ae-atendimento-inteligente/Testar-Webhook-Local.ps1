param(
  [string]$BaseUrl = 'http://localhost:3000',
  [Parameter(Mandatory=$true)][string]$PhoneNumberId,
  [string]$FromPhone = '5511999999999',
  [ValidateSet('reparos','automotivo')][string]$Segment = 'reparos'
)
$ErrorActionPreference = 'Stop'
if (-not $env:AE_META_APP_SECRET) { throw 'Defina AE_META_APP_SECRET na sessao atual. Nao salve em script.' }
if ($Segment -eq 'reparos') { $texts = @('Ola', '2', 'Vazamento no registro do banheiro', 'Bairro Cambui, Campinas', '2') }
else { $texts = @('Ola', '1', 'Bateria nao consegue dar partida', 'Centro, Campinas; carro popular', '2') }
$endpoint = "$BaseUrl/api/webhooks/meta-whatsapp"
$secretBytes = [Text.Encoding]::UTF8.GetBytes($env:AE_META_APP_SECRET)
$hmac = [System.Security.Cryptography.HMACSHA256]::new($secretBytes)
try {
  foreach ($msg in $texts) {
    $payload = @{
      object = 'whatsapp_business_account'
      entry = @(@{ changes = @(@{ field = 'messages'; value = @{
        messaging_product = 'whatsapp'
        metadata = @{ phone_number_id = $PhoneNumberId }
        contacts = @(@{ profile = @{ name = 'Teste Homologacao AE' } })
        messages = @(@{ id = 'wamid.AE.TEST.' + [guid]::NewGuid().ToString('N'); from = $FromPhone; type = 'text'; text = @{ body = $msg } })
      } }) })
    }
    $json = ConvertTo-Json -InputObject $payload -Depth 30 -Compress
    $utf8 = [Text.Encoding]::UTF8.GetBytes($json)
    $signature = [BitConverter]::ToString($hmac.ComputeHash($utf8)).Replace('-', '').ToLowerInvariant()
    $r = Invoke-WebRequest -Uri $endpoint -Method Post -ContentType 'application/json; charset=utf-8' -Headers @{ 'X-Hub-Signature-256' = "sha256=$signature" } -Body $utf8 -UseBasicParsing
    Write-Host "Mensagem: $msg  | HTTP: $($r.StatusCode) | Corpo: $($r.Content)"
  }
} finally { $hmac.Dispose() }
Write-Host 'Concluido. Veja as conversas no painel AE e os registros simulated do outbox.'
