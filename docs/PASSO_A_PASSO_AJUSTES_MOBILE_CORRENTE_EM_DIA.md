# Corrente em Dia — Ajustes mobile de cabeçalho, menu, CTAs e rodapé

## O que foi atualizado

Arquivos principais alterados:

- `src/components/ae-solution-header.tsx`
- `src/app/solucoes/corrente-em-dia/page.tsx`
- `src/app/solucoes/corrente-em-dia/quero-conhecer/page.tsx`
- `public/corrente-em-dia-logo.svg`

## Ajustes aplicados

### 1. Cabeçalho em três níveis

O cabeçalho da landing do Corrente em Dia passa a seguir melhor o padrão mobile da Automação Extrema:

1. Logo da solução + texto **Corrente em Dia** + botões **Quero Conhecer** e **Já sou Cliente**.
2. Subcabeçalho **Desenvolvido por Automação Extrema**, usando logo horizontal/retangular da AE para ocupar menos altura no celular.
3. Menu fixo com navegação por seções:
   - Solução
   - Painel
   - Contribuição
   - Benefícios
   - Como Funciona
   - Cliente Fundador

### 2. CTAs mais chamativos

Os botões principais ganharam destaque visual maior:

- **Quero Conhecer**
- **Falar no WhatsApp**
- **Quero ser Cliente Fundador**
- **Tirar dúvidas no WhatsApp**

### 3. Bloco Benefícios

Foi incluído título de seção antes dos cards, reforçando os ganhos da solução:

> Mais clareza para a organização, menos esforço para quem contribui.

### 4. Minha Contribuição + LGPD

O bloco mantém o aviso de privacidade reforçando que valores e comprovantes são individuais e acessíveis somente ao contribuinte e à organização responsável, conforme consentimento e princípios da LGPD.

### 5. Rodapé/bloco final

O rodapé foi reformulado com:

- logo retangular/horizontal da Automação Extrema;
- texto mais chamativo;
- botão **Falar no WhatsApp**.

## Como atualizar o projeto local

1. Faça backup do projeto atual:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-corrente-mobile.zip -Force
```

2. Extraia o ZIP atualizado por cima da pasta atual do projeto.

3. Rode as validações:

```powershell
npm run lint
npm run build
npm run dev
```

4. Valide localmente:

```txt
http://localhost:3000/solucoes/corrente-em-dia
http://localhost:3000/solucoes/corrente-em-dia/quero-conhecer
```

## Observação sobre build

Se o build reclamar de variáveis Supabase, confirme se o arquivo `.env.local` está presente no projeto local com as chaves reais. No sandbox, o build só foi validado com variáveis temporárias/dummy porque o ZIP não deve conter `.env.local`.

## Atualizar no GitHub

Após validar localmente:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

git status
git add .
git commit -m "Ajusta experiencia mobile do Corrente em Dia"
git push origin main
```

Se sua branch principal for `master`, use:

```powershell
git push origin master
```

## Deploy no Vercel

Se o projeto da Vercel já está conectado ao GitHub, o deploy deve iniciar automaticamente após o `git push`.

Validar em produção:

```txt
https://www.automacaoextrema.com/solucoes/corrente-em-dia
https://www.automacaoextrema.com/solucoes/corrente-em-dia/quero-conhecer
```

Se ainda estiver validando pelo domínio da Vercel:

```txt
https://automacao-extrema.vercel.app/solucoes/corrente-em-dia
https://automacao-extrema.vercel.app/solucoes/corrente-em-dia/quero-conhecer
```

## Forçar deploy pela Vercel CLI, se necessário

Somente se o deploy automático não disparar:

```powershell
npx vercel --prod
```

Escolha o projeto atual da Automação Extrema quando solicitado.

## Roteiro rápido de teste mobile

1. Abrir a landing no celular.
2. Conferir se o cabeçalho não quebra visualmente.
3. Conferir se a logo AE aparece retangular/horizontal no subcabeçalho.
4. Clicar em cada item do menu fixo:
   - Solução
   - Painel
   - Contribuição
   - Benefícios
   - Como Funciona
   - Cliente Fundador
5. Testar o botão **Quero Conhecer**.
6. Testar o botão **Já sou Cliente**.
7. Testar o botão **Falar no WhatsApp**.
8. Testar o formulário de interesse.
9. Conferir o bloco de privacidade/LGPD.
10. Conferir o rodapé com logo retangular e CTA de WhatsApp.
