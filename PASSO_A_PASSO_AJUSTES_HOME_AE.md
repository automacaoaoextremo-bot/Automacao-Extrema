# Automação Extrema — Ajustes da Home Mobile e Submenu

## Arquivos alterados

- `src/app/page.tsx`
- `public/qr-automacao-extrema-home.svg`
- `public/qr-automacao-extrema-whatsapp.svg`
- `PASSO_A_PASSO_AJUSTES_HOME_AE.md`

## Ajustes aplicados

1. O submenu da página pública foi reorganizado nesta ordem:
   - DIAGNÓSTICO
   - SOLUÇÕES
   - TRANSFORMAÇÃO
   - VALOR
   - PARA QUEM
   - COMO FUNCIONA
   - NETWORKING E PARCERIAS
   - QR CODES

2. O submenu deixou de usar rolagem horizontal no celular.
   - Agora ele quebra linha automaticamente.
   - Os botões ficaram menores para manter boa leitura mobile.

3. A primeira dobra ficou mais próxima do submenu.
   - O texto `DIAGNÓSTICO DE VALOR E DOR OPERACIONAL` aparece logo abaixo do submenu.

4. Foi removido da home o texto:
   - `Não solicita senha, cartão, pagamento ou instalação...`

5. A página principal foi reorganizada exatamente nesta sequência:
   - Diagnóstico de Valor e Dor Operacional
   - Exemplos Reais / Soluções
   - Exemplos de Transformação
   - Valor antes da solução
   - Para quem faz sentido
   - Como funciona
   - Networking e Parcerias
   - QR Codes

6. Os QR Codes foram mantidos no final da página.
   - QR da home: `https://automacaoextrema.com/`
   - QR do WhatsApp: `https://automacaoextrema.com/api/whatsapp?origem=site`

7. A mensagem do WhatsApp permanece genérica:
   - `Olá! Conheci a Automação Extrema e quero fazer um diagnóstico rápido para entender onde meu negócio perde tempo, dinheiro ou controle.`

## Como atualizar o projeto

1. Faça backup do projeto atual.

2. Descompacte o ZIP recebido.

3. Copie os arquivos e pastas descompactados para a raiz do projeto local, mantendo a estrutura de pastas.

4. No PowerShell, execute:

```powershell
cd C:\Users\lacos\Documents\GitHub\Automacao-Extrema
npm install
npm run lint
npm run build
npm run dev
```

5. Teste localmente:

```text
http://localhost:3000/
http://localhost:3000/bni/roteiro-cafe
http://localhost:3000/api/whatsapp?origem=site
```

6. Faça commit e push:

```powershell
git status
git add .
git commit -m "Ajusta home mobile e submenu da Automação Extrema"
git push
```

7. No Vercel, confirme se existe a variável:

```env
NEXT_PUBLIC_AE_WHATSAPP_NUMBER=5519999999999
```

Substitua pelo WhatsApp real da Automação Extrema, usando somente números com DDI + DDD + número.

## Observação

O acesso de gestão continua disponível pelas rotas internas, mas não aparece na página pública.
