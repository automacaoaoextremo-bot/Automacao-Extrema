# Passo a passo de atualização — Corrente em Dia BotConversa lookup final

## Arquivos alterados

- `src/app/solucoes/corrente-em-dia/obrigado/page.tsx`
- `src/app/api/corrente-em-dia/leads/lookup/route.ts`
- `src/lib/ae-public-links.ts`
- `docs/PASSO_A_PASSO_BOTCONVERSA_CORRENTE_EM_DIA_LOOKUP_FINAL.md`

## Atualização local

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Faça backup:

```powershell
Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-botconversa-lookup-final.zip -Force
```

Extraia o ZIP atualizado por cima da pasta atual.

Rode:

```powershell
npm run lint
npm run build
npm run dev
```

## Variável opcional

Se quiser deixar o número da AE configurável, adicione em `.env.local` e na Vercel:

```env
NEXT_PUBLIC_AE_WHATSAPP_NUMBER=5519989848246
```

Se não configurar, o sistema usa `5519989848246` como padrão.

## Teste local

Abra:

```text
http://localhost:3000/api/corrente-em-dia/leads/lookup
```

Deve retornar JSON com `ok: true`.

Teste POST:

```powershell
$body = @{ source = "botconversa_ced_site"; whatsapp = "{{telefone}}" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/corrente-em-dia/leads/lookup" -Method Post -ContentType "application/json" -Body $body
```

Mesmo com `{{telefone}}`, deve retornar `botconversaMessage`.

## GitHub

```powershell
git status
git add .
git commit -m "Corrige lookup BotConversa Corrente em Dia"
git push origin main
```

Se sua branch principal for `master`:

```powershell
git push origin master
```

## Vercel

Se a Vercel estiver conectada ao GitHub, o deploy deve iniciar automaticamente.

Para forçar deploy:

```powershell
npx vercel --prod
```

Depois valide em produção:

```text
https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup
```

No BotConversa, teste novamente a requisição.

## Ajuste no BotConversa

1. Palavra-chave do fluxo `CED - Lead vindo do site` deve estar como **Contém**.
2. Integração deve usar:

```text
POST https://www.automacaoextrema.com/api/corrente-em-dia/leads/lookup
```

3. Header:

```text
Content-Type: application/json
```

4. Body:

```json
{
  "source": "botconversa_ced_site",
  "whatsapp": "{{telefone}}"
}
```

5. Mapear:

```text
botconversaMessage -> ced_resp_botconversa
found -> ced_found
name -> ced_nome_contato
email -> ced_email
leadId -> ced_lead_id
loginUrl -> ced_login_url
status -> ced_status
```

6. O bloco de conteúdo após a integração deve enviar apenas:

```text
{{ced_resp_botconversa}}
```

7. Não conectar a saída **Continuar sem esperar resposta**.
