# Passo a passo — Ajustes BNI / Página principal Automação Extrema

## O que foi alterado

1. A página principal `/` foi reorganizada para ficar mais adequada ao networking e à comunicação de valor:
   - Hero com declaração de valor;
   - exemplos de transformação;
   - seção `Soluções` logo depois da primeira dobra;
   - seção `Valor antes da solução`;
   - seção `Para quem faz sentido`;
   - seção `Como funciona`;
   - seção `Networking e parcerias`;
   - seção final de QR Codes.

2. O botão `Gestão` foi removido do topo público.
   - A área administrativa continua existindo em `/login` e `/admin/ae`.
   - O acesso apenas não fica mais exposto na página pública.

3. Foi criado um submenu fixo de acesso rápido na home:
   - Valor;
   - Soluções;
   - Para quem;
   - Como funciona;
   - Networking;
   - QR Codes.

4. O quadro grande com a logo e os QR Codes foi removido da primeira dobra.
   - Os QR Codes foram movidos para o final da página.

5. Os textos dos exemplos foram atualizados:
   - Bingo Sementinha / Bingo no Controle;
   - Tucxa Festa Junina / Festa no Controle;
   - Impacto no Controle.

6. A mensagem do WhatsApp foi alterada para uma frase genérica, sem citar BNI:

   `Olá! Conheci a Automação Extrema e quero fazer um diagnóstico rápido para entender onde meu negócio perde tempo, dinheiro ou controle.`

7. O QR Code de WhatsApp foi recriado para apontar para:

   `https://automacaoextrema.com/api/whatsapp?origem=site`

8. A página pessoal `/bni/roteiro-cafe` também foi ajustada com os novos textos dos cases e a sugestão de resposta para o Adriano.

## Arquivos alterados

- `src/app/page.tsx`
- `src/components/site-header.tsx`
- `src/app/api/whatsapp/route.ts`
- `src/lib/ae-public-links.ts`
- `src/app/bni/roteiro-cafe/page.tsx`
- `public/qr-automacao-extrema-home.svg`
- `public/qr-automacao-extrema-whatsapp.svg`

## Como aplicar no projeto local

1. Faça backup do projeto atual.
2. Descompacte o ZIP recebido.
3. Copie os arquivos e pastas descompactados para a raiz do projeto `Automacao-Extrema`, substituindo os arquivos existentes.
4. Confirme que o arquivo `.env.local` local continua preservado. Ele não foi incluído no ZIP por segurança.

## Comandos para validar localmente

No PowerShell:

```powershell
cd C:\Users\lacos\Documents\GitHub\Automacao-Extrema
npm install
npm run lint
npm run build
npm run dev
```

Depois acesse:

```text
http://localhost:3000/
http://localhost:3000/bni/roteiro-cafe
http://localhost:3000/api/whatsapp?origem=site
```

## Variável de WhatsApp no Vercel

Confirme no Vercel se existe a variável:

```env
NEXT_PUBLIC_AE_WHATSAPP_NUMBER=5519999999999
```

Use o número real da Automação Extrema com DDI + DDD + telefone, apenas dígitos.

Exemplo de Campinas:

```env
NEXT_PUBLIC_AE_WHATSAPP_NUMBER=5519999999999
```

Depois faça novo deploy.

## Deploy

Após validar localmente:

```powershell
git status
git add .
git commit -m "Ajusta home da Automação Extrema para networking e diagnóstico"
git push
```

O Vercel deverá publicar automaticamente.

## Validações realizadas

Foram executados com sucesso:

```powershell
npm run lint
npm run build
```

O build foi validado com variáveis temporárias de Supabase e WhatsApp, apenas para compilação local no ambiente de teste.
