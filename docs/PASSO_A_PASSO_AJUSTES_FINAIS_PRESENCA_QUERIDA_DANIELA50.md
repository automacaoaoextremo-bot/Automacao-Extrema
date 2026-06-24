# Passo a passo — ajustes finais da LP/WhatsApp do Presença Querida (Daniela 50 anos)

## O que este pacote atualiza

1. **Convites para aprovação / WhatsApp**
   - mensagem mais afetiva no estilo Deep Dive;
   - inclui saudação personalizada por parentesco;
   - explica o envio antecipado do convite no próprio WhatsApp;
   - mantém link direto para a LP com confirmação na própria página;
   - inclui assinatura `Daniela Mattano da Silva`.

2. **Landing page pública do evento**
   - cabeçalho com navegação mobile por âncoras;
   - link de destaque para a confirmação (`Convite: Nome`);
   - foto da Daniela posicionada logo após o texto principal;
   - bloco único de **Quando e Onde** com as 2 fotos da chácara;
   - botão **Abrir no Google Maps**;
   - botão **Conheça mais do espaço** com destaque e link para o Instagram da chácara;
   - confirmação direto na LP;
   - remoção dos blocos redundantes;
   - prazo final ajustado para **19/11/2026**;
   - campo `Curiosidade ou recado para a Daniela`.

3. **Programação**
   - inclusão da foto da **Banda Raça de Quintal**;
   - inclusão da foto do **DJ Gabriel Mattano**;
   - Instagram do DJ ajustado para `https://www.instagram.com/gabrielmattanosilva/`.

4. **Cardápio**
   - visual mais próximo do estilo da Festa Junina/Tucxa;
   - itens sem preço;
   - textos mais persuasivos;
   - destaque do **Chopp Kremer** com foto e link mantido.

5. **Fechamento da LP**
   - mantém a frase `Uma celebração com presença, carinho e memória`;
   - remove as 3 fotos finais da Daniela;
   - remove a seção `Recebeu seu link individual?`.

---

## Arquivos incluídos neste pacote

### Código
- `src/lib/presenca-daniela50.ts`
- `src/components/presenca-public-confirmation.tsx`
- `src/app/solucoes/presenca-querida/evento/[slug]/page.tsx`
- `src/app/api/presenca-querida/cliente/messages/generate-invitations/route.ts`

### Assets novos
- `public/presenca-querida/daniela-50-anos/chacara-01.png`
- `public/presenca-querida/daniela-50-anos/chacara-02.png`
- `public/presenca-querida/daniela-50-anos/chopp-kremer.png`
- `public/presenca-querida/daniela-50-anos/dj-gabriel.png`
- `public/presenca-querida/daniela-50-anos/raca-de-quintal.png`

### SQL opcional
- `supabase/sql/20260623_10_presenca_querida_daniela50_lp_final.sql`

> Observação: o SQL é **opcional**, mas recomendado para alinhar o cadastro do evento no banco com os textos e links atuais.

---

## Como aplicar

### 1) Descompactar o ZIP na raiz do projeto
Exemplo:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Extraia o conteúdo do ZIP na raiz do projeto e **substitua os arquivos existentes**.

---

### 2) Rodar o SQL opcional no Supabase
No Supabase SQL Editor, execute:

```text
supabase/sql/20260623_10_presenca_querida_daniela50_lp_final.sql
```

---

### 3) Validar localmente
Na raiz do projeto:

```powershell
npm install
npm run lint
npx tsc --noEmit
npm run build
```

---

### 4) Testar os pontos principais

#### LP pública sem token
```text
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos
```

#### LP pública com token
Substitua `TOKEN_AQUI` por um token real de convidado:

```text
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos?convite=TOKEN_AQUI#confirmacao
```

#### Gerar novamente os convites para aprovação
Na área logada do cliente, acesse:

```text
/solucoes/presenca-querida/cliente/mensagens
```

ou use a ação que dispara a rota:

```text
POST /api/presenca-querida/cliente/messages/generate-invitations
```

Assim os textos de WhatsApp serão recriados com o novo formato afetivo.

---

## O que conferir após a atualização

### WhatsApp / convites para aprovação
- saudação personalizada (`Oi, Mariana! Filha querida!`);
- frase `Sua mãe vai comemorar 50 anos...` quando o parentesco permitir;
- explicação do envio antecipado do convite;
- link direto para a LP;
- assinatura `Daniela Mattano da Silva`.

### LP
- menu superior com âncoras;
- foto da Daniela logo após o texto principal;
- bloco único `Quando e onde` com as duas fotos da chácara;
- botão `Conheça mais do espaço` destacado;
- bloco `Convite para ...` dentro da confirmação;
- prazo final `19/11/2026`;
- campo `Curiosidade ou recado para a Daniela`.

### Programação
- foto da banda aparecendo;
- foto do DJ aparecendo;
- link do Instagram do DJ correto.

### Cardápio
- itens sem preço;
- cards com textos mais persuasivos;
- bloco do Chopp Kremer com imagem e link.

---

## Deploy na Vercel
Se estiver tudo certo localmente:

```powershell
vercel --prod
```

ou, se o projeto já estiver conectado ao GitHub/Vercel, basta:

```powershell
git add .
git commit -m "Ajustes finais LP/WhatsApp Daniela 50 anos no Presença Querida"
git push
```

A Vercel fará o deploy automaticamente.

---

## Observação importante
Depois da atualização, **gere novamente os convites para aprovação**, porque os textos de WhatsApp antigos não mudam sozinhos se já estiverem gravados na tabela `pq_guest_messages`.
