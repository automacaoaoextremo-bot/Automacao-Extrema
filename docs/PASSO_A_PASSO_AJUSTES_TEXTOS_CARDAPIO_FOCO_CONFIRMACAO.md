# Passo a passo — Presença Querida / Daniela 50 anos

## O que este pacote ajusta

1. Inclui **Café** na categoria de bebidas.
2. Inclui **Petit fours** na categoria de bolo/doces.
3. Troca a categoria **Bolo e docinhos** para **Bolo e doces finos**.
4. Remove o sabor do bolo do cardápio: agora aparece apenas **Bolo**.
5. Troca o título da LP para: **Sua presença é muito querida nos meus 50 anos.**
6. Troca o texto inicial para:
   - **Quero celebrar meus 50 anos com pessoas que fazem parte da minha história.**
   - **Esta página reúne detalhes da festa e também permite a confirmação da sua presença.**
7. Troca o endereço exibido para: **Valinhos, Campinas - SP**.
8. Para convidados ainda não confirmados, deixa a opção **Sim, confirma presença** como padrão marcada.
9. Troca o texto da Banda Raça de Quintal para: **No melhor momento da tarde, a Banda Raça de Quintal entra para embalar a celebração com muito samba e alegria!**
10. Corrige uma duplicação visual de foto da Chácara Piloto que estava aparecendo em alguns pacotes anteriores.

---

## Arquivos alterados

Substitua estes arquivos na raiz do projeto:

```txt
src/lib/presenca-daniela50.ts
src/app/solucoes/presenca-querida/evento/[slug]/page.tsx
src/components/presenca-public-confirmation.tsx
src/app/api/presenca-querida/cliente/event/route.ts
supabase/sql/20260625_12_presenca_querida_textos_cardapio_foco_confirmacao.sql
```

---

## Como aplicar

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Descompacte o ZIP na raiz do projeto e permita sobrescrever os arquivos existentes.

---

## SQL recomendado

Execute no Supabase SQL Editor:

```txt
supabase/sql/20260625_12_presenca_querida_textos_cardapio_foco_confirmacao.sql
```

Esse SQL atualiza o cadastro do evento no banco para ficar alinhado com os textos, cardápio e endereço atuais.

Mesmo sem rodar o SQL, a LP da Daniela 50 anos usa os textos padrão corrigidos do código. Porém, o SQL é recomendado para manter o cadastro do evento e a área de edição alinhados.

---

## Validar localmente

Depois de substituir os arquivos e rodar o SQL:

```powershell
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Teste a LP:

```txt
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos
```

Teste com convite:

```txt
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos?convite=TOKEN_AQUI
```

---

## Conferências rápidas

Na LP pública, conferir:

- título: **Sua presença é muito querida nos meus 50 anos.**
- texto inicial em primeira pessoa;
- endereço: **Valinhos, Campinas - SP**;
- descrição da Banda Raça de Quintal com “muito samba e alegria!”;
- cardápio com **Café**, **Bolo**, **Doces finos** e **Petit fours**;
- convidado pendente já aparece com **Sim, confirma presença** marcado por padrão.

---

## Deploy

Se tudo passar localmente:

```powershell
git status
git add .
git commit -m "Ajusta textos e cardápio da LP Daniela 50 anos"
git push origin main
```

A Vercel deve fazer o deploy automaticamente se o projeto estiver conectado ao GitHub.
