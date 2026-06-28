# Passo a passo — Presença Querida: local e foco padrão para pendentes

## O que este pacote corrige

1. Na landing page pública do evento Daniela 50 anos, o local passa de:

```txt
Valinhos, Campinas - SP
```

para:

```txt
Valinhos, SP
```

2. Para convidados com status atual **Pendente**, a opção visualmente marcada passa a ser:

```txt
Sim, confirma presença
```

3. O texto de status continua correto:

```txt
Atual: Pendente
```

Ou seja: a página incentiva a confirmação, mas não altera o status real até a pessoa clicar em **Registrar minha resposta**.

## Arquivos incluídos

```txt
src/components/presenca-public-confirmation.tsx
src/lib/presenca-daniela50.ts
src/app/api/presenca-querida/cliente/event/route.ts
supabase/sql/20260625_12_presenca_querida_textos_cardapio_foco_confirmacao.sql
supabase/sql/20260625_13_presenca_querida_local_foco_pendente.sql
```

## Como aplicar

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Descompacte o ZIP na raiz do projeto e permita sobrescrever os arquivos.

## SQL recomendado

Execute no Supabase SQL Editor:

```txt
supabase/sql/20260625_13_presenca_querida_local_foco_pendente.sql
```

Esse SQL apenas atualiza o cadastro do evento para:

```txt
address = 'Valinhos, SP'
city = 'Valinhos'
state = 'SP'
```

## Validação local

Depois de substituir os arquivos:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Testes recomendados

1. Acesse a LP pública:

```txt
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos
```

Confira se aparece:

```txt
Valinhos, SP
```

2. Acesse um convite de convidado pendente:

```txt
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos?convite=TOKEN_AQUI
```

Confira se:

```txt
Atual: Pendente
```

continua aparecendo, mas o botão marcado visualmente é:

```txt
Sim, confirma presença
```

3. Altere para **Decidir depois** e salve, caso queira validar que a opção ainda existe para manter pendente.
