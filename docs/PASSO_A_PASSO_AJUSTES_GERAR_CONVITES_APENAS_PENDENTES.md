# Passo a passo — Presença Querida: gerar convites apenas não aprovados

## O que esta atualização corrige

1. O botão **Gerar convites personalizados** passa a preservar convites já aprovados.
2. Convites novos são gerados para convidados recém-incluídos.
3. Convites ainda pendentes/reprovados são atualizados/regenerados, inclusive quando o convidado foi alterado.
4. Convites já aprovados não são sobrescritos.
5. O texto do WhatsApp passa a usar o novo modelo solicitado, com espaçamento entre parágrafos.

## Arquivos alterados

Substitua estes arquivos na raiz do projeto:

```text
src/app/api/presenca-querida/cliente/messages/generate-invitations/route.ts
src/app/solucoes/presenca-querida/cliente/mensagens/page.tsx
src/lib/presenca-daniela50.ts
```

## Como aplicar

1. Descompacte o ZIP na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

2. Permita sobrescrever os arquivos existentes.

3. Rode as validações:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Como testar

1. Acesse a área do cliente:

```text
/solucoes/presenca-querida/cliente/mensagens
```

2. Clique em **Gerar convites personalizados**.

3. Confira a mensagem de retorno. Agora ela mostra:

```text
Convites gerados/atualizados: X (Y novos, Z atualizados). Preservados por já estarem aprovados: N. Ignorados: M.
```

4. Confira se os convites aprovados não foram alterados.

5. Inclua um novo convidado e clique novamente em **Gerar convites personalizados**. O sistema deve criar somente o convite novo e atualizar os convites que ainda não estiverem aprovados.

## Novo modelo de WhatsApp

O texto gerado segue este formato:

```text
Oi, Solange!

Vou comemorar meus 50 anos e faço questão de te convidar.

Mesmo faltando alguns meses, dezembro costuma encher rápido de festas, confraternizações e compromissos de fim de ano. Por isso o convite está chegando agora: para você já reservar a data e para conseguirmos organizar buffet, bebidas, mesas e recepção com calma, sem transformar confirmação em cobrança.

O prazo ideal para confirmar é até 19/11/2026. No link abaixo estão os detalhes da festa. Depois de conhecer tudo, ao final da página estão os botões para responder:

https://www.automacaoextrema.com/solucoes/presenca-querida/evento/daniela-50-anos?convite=TOKEN

Daniela Mattano da Silva
```

## Observação importante

Como a regra agora preserva convites aprovados, um convite aprovado não será sobrescrito automaticamente. Para gerar novamente usando o novo modelo, primeiro clique em **Reprovar** ou volte o convite para pendente, e então clique em **Gerar convites personalizados**.

Não há SQL obrigatório nesta atualização.
