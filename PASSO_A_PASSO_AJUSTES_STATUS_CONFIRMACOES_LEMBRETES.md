# Passo a passo — ajustes de status, confirmações e lembretes do Presença Querida

## O que esta atualização corrige

1. **Status Pendente na LP pública**
   - Convidados ainda não confirmados agora aparecem claramente como **Pendente**.
   - Isso vale para convidados principais e convidados vinculados, como Gabriel vinculado à Letícia.
   - A opção selecionada para quem está pendente passa a ser **Decidir depois**, evitando parecer que a presença já está confirmada.

2. **Painel de Confirmações na área de gestão**
   - A página `Confirmações` agora mostra:
     - totais por status;
     - lista de todos os convidados;
     - convidado principal ou vinculado;
     - status individual;
     - data/hora da resposta;
     - observação alimentar;
     - recado/curiosidade;
     - contatos;
     - ação para limpar respostas de teste.

3. **Cancelamento de respostas de teste**
   - Incluída ação para limpar a resposta de um convidado específico.
   - Incluída ação para limpar todas as respostas de teste do evento.
   - Ao limpar, o convidado volta para **Pendente**, `confirmed_at` volta para `null` e observações/recados podem ser limpos.

4. **Próximos envios previstos**
   - Incluído painel com o calendário operacional:
     - primeiro convite oficial em **01/07/2026**;
     - lembretes para confirmados;
     - lembretes para quem marcou talvez;
     - lembretes para pendentes;
     - data do aviso interno com 2 dias de antecedência;
     - quantidade atual de convidados por público;
     - status operacional do envio.

---

## Arquivos incluídos

```txt
src/components/presenca-public-confirmation.tsx
src/app/solucoes/presenca-querida/cliente/confirmacoes/page.tsx
src/app/api/presenca-querida/cliente/confirmations/route.ts
src/app/api/presenca-querida/cliente/confirmations/reset/route.ts
```

---

## Como aplicar

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Descompacte o ZIP na raiz do projeto e permita sobrescrever os arquivos.

---

## Validação local

Depois de aplicar:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

---

## Testes recomendados

### 1. Testar status pendente na LP
Abra um link de convidado principal com convidado vinculado:

```txt
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos?convite=TOKEN
```

Confira se convidados ainda não respondidos aparecem com:

```txt
Atual: Pendente
```

E se a opção selecionada deles é:

```txt
Decidir depois
```

### 2. Testar Confirmações
Acesse:

```txt
http://localhost:3000/solucoes/presenca-querida/cliente/confirmacoes
```

Confira:

- cards de total, confirmados, pendentes, talvez e não irão;
- lista completa dos convidados;
- convidados vinculados;
- data/hora de resposta;
- botão **Limpar teste**;
- botão **Cancelar respostas de teste**.

### 3. Testar limpar resposta individual
Na página de Confirmações:

1. Escolha um convidado confirmado ou talvez.
2. Clique em **Limpar teste**.
3. Confirme a ação.
4. Verifique se voltou para **Pendente**.

### 4. Testar limpar todas as respostas de teste
Na página de Confirmações:

1. Clique em **Cancelar respostas de teste**.
2. Confirme a ação.
3. Verifique se todos voltaram para **Pendente**.

Use essa opção somente durante testes.

---

## Deploy

Depois dos testes locais:

```powershell
git status
git add .
git commit -m "feat: adiciona painel de confirmações e lembretes do Presença Querida"
git push origin main
```

A Vercel deve publicar automaticamente se o projeto estiver conectado ao GitHub.

---

## Observação

Não há SQL obrigatório nesta atualização. O painel usa as tabelas atuais `pq_guests`, `pq_events` e a autenticação já existente da área do cliente.
