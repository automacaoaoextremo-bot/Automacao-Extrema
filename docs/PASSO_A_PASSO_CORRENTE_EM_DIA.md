# Passo a passo — Corrente em Dia dentro da Automação Extrema

## 1. Decisão de estrutura

Use o projeto atual:

`C:\Users\lacos\Documents\GitHub\automacao-extrema`

Não crie um projeto separado para a V1. A solução Corrente em Dia deve ser um módulo/rota dentro da plataforma AE.

## 2. Criar branch

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
git status
git checkout -b feature/corrente-em-dia-v1
```

## 3. Instalar arquivos do pacote

```powershell
powershell -ExecutionPolicy Bypass -File C:\CAMINHO\DO\PACOTE\instalar-corrente-em-dia.ps1 -ProjectRoot C:\Users\lacos\Documents\GitHub\automacao-extrema
```

## 4. Rodar SQL no Supabase

No Supabase SQL Editor, execute em ordem:

```txt
supabase/sql/20260611_01_cadastro_solucao_corrente_em_dia.sql
supabase/sql/20260611_02_base_corrente_em_dia.sql
supabase/sql/20260611_03_seed_corrente_em_dia_dados_fakes.sql
```

O arquivo 01 cadastra a solução no catálogo AE. O arquivo 02 cria a base específica da V1. O arquivo 03 carrega dados fictícios para teste.

## 5. Validar localmente

```powershell
npm run lint
npm run build
npm run dev
```

Abra:

```txt
http://localhost:3000/solucoes/corrente-em-dia
http://localhost:3000/c/casa-pai-benedito-das-matas
http://localhost:3000/admin/ae/corrente-em-dia
```

## 6. Publicar

```powershell
git status
git add .
git commit -m "Adiciona Corrente em Dia V1"
git push -u origin feature/corrente-em-dia-v1
```

Depois abrir Pull Request ou mesclar conforme o fluxo atual.

## 7. Vercel

Como a solução fica dentro do projeto AE, o Vercel continua sendo o mesmo projeto atual da Automação Extrema. O domínio também permanece o mesmo:

```txt
www.automacaoextrema.com/solucoes/corrente-em-dia
www.automacaoextrema.com/c/[cliente]
```

Subdomínios por cliente podem ser avaliados depois, quando houver volume e necessidade comercial.
