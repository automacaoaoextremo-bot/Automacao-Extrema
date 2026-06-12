# Corrente em Dia — ajustes de usabilidade e microcopy

## Arquivos atualizados

- `src/app/solucoes/corrente-em-dia/login/page.tsx`
- `src/app/solucoes/corrente-em-dia/quero-conhecer/page.tsx`

## O que mudou

### Página Já sou Cliente / Login

- Removido o título grande `Entrar no Corrente em Dia`, já que o nome da solução aparece no cabeçalho.
- A primeira chamada passou a ser `ÁREA DO CLIENTE - LOGIN`.
- Removido o texto `LOGIN DO CLIENTE`.
- O texto explicativo foi encurtado para ocupar menos espaço no celular.
- O formulário de login ficou mais próximo da primeira dobra mobile.

### Página Quero Conhecer

- A microcopy de Cliente Fundador foi substituída por uma versão mais curta:
  `Entre como Cliente Fundador e participe da fase inicial com condições especiais, prioridade nas melhorias e acompanhamento mais próximo.`

## Validação recomendada

```powershell
npm run lint
npm run build
npm run dev
```

Validar no navegador:

```text
http://localhost:3000/solucoes/corrente-em-dia/login
http://localhost:3000/solucoes/corrente-em-dia/quero-conhecer
```

## GitHub

```powershell
git status
git add .
git commit -m "Ajusta login e microcopy do Cliente Fundador Corrente em Dia"
git push origin main
```

Se sua branch principal for `master`:

```powershell
git push origin master
```

## Vercel

Com o Vercel conectado ao GitHub, o deploy deve iniciar automaticamente após o `git push`.

Validar em produção:

```text
https://www.automacaoextrema.com/solucoes/corrente-em-dia/login
https://www.automacaoextrema.com/solucoes/corrente-em-dia/quero-conhecer
```

Para forçar deploy:

```powershell
npx vercel --prod
```
