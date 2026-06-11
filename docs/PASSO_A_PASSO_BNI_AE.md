# Atualização BNI — Automação Extrema

## O que foi alterado

Esta atualização transforma a página principal `https://automacaoextrema.com/` em uma página mais completa para networking, diagnóstico e apresentação da Automação Extrema.

Também cria a página de apoio pessoal:

- `https://automacaoextrema.com/bni/roteiro-cafe`

Essa página não aparece no menu e foi marcada como `noindex` para não ser indexada por buscadores.

## Arquivos atualizados e novos

Copie estes arquivos para a raiz do projeto, preservando as pastas:

- `src/app/page.tsx`
- `src/app/bni/roteiro-cafe/page.tsx`
- `src/app/api/whatsapp/route.ts`
- `src/lib/ae-public-links.ts`
- `public/qr-automacao-extrema-home.svg`
- `public/qr-automacao-extrema-whatsapp.svg`

## Configuração recomendada do WhatsApp

A página e o QR de WhatsApp usam a rota:

- `/api/whatsapp?origem=bni`

Essa rota redireciona para o WhatsApp da AE quando a variável abaixo estiver configurada:

```env
NEXT_PUBLIC_AE_WHATSAPP_NUMBER=5519999999999
```

Troque `5519999999999` pelo número real da Automação Extrema, sempre com DDI + DDD + número, apenas dígitos.

Exemplos:

```env
NEXT_PUBLIC_AE_WHATSAPP_NUMBER=5519987654321
```

No Vercel:

1. Acesse o projeto da Automação Extrema.
2. Vá em **Settings**.
3. Entre em **Environment Variables**.
4. Crie ou atualize a variável `NEXT_PUBLIC_AE_WHATSAPP_NUMBER`.
5. Salve.
6. Faça novo deploy.

Se essa variável não estiver configurada, o link de WhatsApp ainda abre o WhatsApp com a mensagem pronta, mas sem destinatário fixo.

## Passo a passo para atualizar localmente

1. Descompacte o zip enviado pelo ChatGPT.
2. Copie os arquivos para dentro do projeto local `Automacao-Extrema`, mantendo a estrutura de pastas.
3. No PowerShell, entre na pasta do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\Automacao-Extrema
```

4. Instale dependências, se necessário:

```powershell
npm install
```

5. Rode o lint:

```powershell
npm run lint
```

6. Rode o build:

```powershell
npm run build
```

7. Rode localmente:

```powershell
npm run dev
```

8. Abra no navegador:

```text
http://localhost:3000/
http://localhost:3000/bni/roteiro-cafe
```

## Passo a passo para subir no GitHub e Vercel

Depois de validar localmente:

```powershell
git status
git add src/app/page.tsx src/app/bni/roteiro-cafe/page.tsx src/app/api/whatsapp/route.ts src/lib/ae-public-links.ts public/qr-automacao-extrema-home.svg public/qr-automacao-extrema-whatsapp.svg
git commit -m "Cria pagina principal AE para BNI e roteiro do cafe"
git push
```

O Vercel deve iniciar o deploy automaticamente.

## Validação feita nesta entrega

- `npm run lint`: executado com sucesso.
- `npm run build`: executado com sucesso usando variáveis de ambiente temporárias/dummy para Supabase, porque o zip não continha `.env.local`.

Com as variáveis reais já configuradas no Vercel, o build deve usar os valores corretos do projeto.
