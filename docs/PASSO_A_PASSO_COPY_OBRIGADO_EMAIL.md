# Atualização — copy da página de obrigado e e-mail do Diagnóstico AE

## O que foi ajustado

1. Página `/obrigado`
   - Inclui o primeiro nome de quem respondeu o diagnóstico, quando informado.
   - Substitui o texto público de “oportunidade” por “solução da Automação Extrema que mais parece fazer sentido para o seu caso”.
   - Mantém o termo “oportunidade” apenas para leitura interna da Automação Extrema.

2. E-mail enviado após o diagnóstico
   - Inclui saudação com o primeiro nome do lead.
   - Substitui “oportunidade mais próxima” por “solução da Automação Extrema que mais parece fazer sentido para o seu caso”.
   - Ajusta o assunto para “Diagnóstico AE recebido — solução sugerida: ...”.
   - Mantém o score como “Score interno do diagnóstico”.
   - Adiciona escape básico de HTML nos dados vindos do formulário.

3. Redirecionamento após envio do diagnóstico
   - Agora envia também o nome para a página de obrigado.

4. Mensagens do funil
   - Ajustadas para falar em “solução sugerida” ou “caminho inicial”, evitando chamar a sugestão para o lead de “oportunidade”.

## Arquivos alterados

```text
src/app/obrigado/page.tsx
src/app/diagnostico/page.tsx
src/lib/mail.ts
src/lib/followups.ts
```

## Como atualizar o projeto

Na raiz do projeto local:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

git status
git add .
git commit -m "backup antes dos ajustes de copy obrigado e email"
```

Descompacte este zip por cima da pasta do projeto, substituindo os arquivos.

Depois rode:

```powershell
npm install
npm run lint
npm run build
npm run dev
```

Teste localmente:

```text
http://localhost:3000/diagnostico
```

Preencha o diagnóstico com nome e e-mail. Ao concluir, valide:

- a página `/obrigado` deve mostrar o nome;
- a frase deve falar em “solução”, não “oportunidade”; 
- o e-mail recebido deve usar a mesma lógica.

## Publicar no Vercel

Depois de validar localmente:

```powershell
git status
git add src/app/obrigado/page.tsx src/app/diagnostico/page.tsx src/lib/mail.ts src/lib/followups.ts PASSO_A_PASSO_COPY_OBRIGADO_EMAIL.md
git commit -m "fix: ajusta copy da solucao sugerida no obrigado e email"
git push
```

A Vercel deve iniciar o deploy automaticamente pelo GitHub.

## Observação

Não é necessário rodar SQL para esta atualização, pois os ajustes são apenas de texto, redirecionamento e e-mail.
