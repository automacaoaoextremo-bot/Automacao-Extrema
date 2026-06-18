# Passo a passo — atualizar autoajuda e checklist do Corrente em Dia

## 1. Backup

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-autoajuda-checklist.zip -Force
```

## 2. Extrair ZIP atualizado

Extraia o ZIP enviado por cima da pasta atual do projeto.

## 3. Não há SQL obrigatório

Esta etapa usa dados já existentes e calcula o checklist pelo novo endpoint:

```text
/api/corrente-em-dia/cliente/onboarding
```

O SQL `20260616_06_area_logada_corrente_em_dia.sql` continua sendo o SQL necessário para a área logada V1.

## 4. Rodar validação

```powershell
npm run lint
npm run build
npm run dev
```

## 5. URLs para testar

```text
http://localhost:3000/solucoes/corrente-em-dia/cliente
http://localhost:3000/solucoes/corrente-em-dia/cliente/primeiros-passos
http://localhost:3000/solucoes/corrente-em-dia/cliente/cadastro
http://localhost:3000/solucoes/corrente-em-dia/cliente/configuracoes
http://localhost:3000/solucoes/corrente-em-dia/cliente/contribuintes
http://localhost:3000/solucoes/corrente-em-dia/cliente/contribuir
http://localhost:3000/solucoes/corrente-em-dia/cliente/aprovacoes
```

## 6. GitHub

```powershell
git status
git add .
git commit -m "Adiciona autoajuda e checklist do Corrente em Dia"
git push origin main
```

Se a branch principal for `master`:

```powershell
git push origin master
```

## 7. Vercel

Deploy automático após push se conectado ao GitHub.

Para forçar:

```powershell
npx vercel --prod
```

## 8. BotConversa

Atualize o fluxo conforme:

```text
docs/PASSO_A_PASSO_BOTCONVERSA_CORRENTE_EM_DIA_AUTOAJUDA.md
```
