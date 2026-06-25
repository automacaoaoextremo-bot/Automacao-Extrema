# Passo a passo — Presença Querida: obrigado, e-mails, lembretes e ajustes visuais

## O que este pacote atualiza

1. **LP pública com letras menores**
   - Redução proporcional dos títulos, subtítulos, textos, cards e botões.
   - Cabeçalho também ficou um pouco mais compacto.

2. **Página de obrigado personalizada**
   - Após registrar a resposta, o convidado é levado para:
     - `/solucoes/presenca-querida/evento/[slug]/obrigado?convite=TOKEN`
   - A página mostra:
     - mensagem de agradecimento mais afetiva e persuasiva;
     - status atual de cada pessoa do convite;
     - orientação para avisar/alterar resposta em caso de imprevisto;
     - botão para alterar a resposta;
     - botão para abrir o local no mapa.

3. **Status ao reabrir o link**
   - Ao acessar novamente o link recebido no WhatsApp, o card de confirmação mostra que já existe resposta registrada.
   - O convidado pode alterar a resposta na própria página.

4. **E-mail interno a cada resposta**
   - Sempre que o convidado registra ou altera resposta, a API tenta enviar e-mail para:
     - `EMAIL_COPY_TO`, quando configurado;
     - ou `automacao.ao.extremo@gmail.com`, como fallback.
   - O e-mail inclui evento, convidado principal, respostas anteriores/novas, observações e link do convite.

5. **Programação de lembretes**
   - Nova rota:
     - `/api/cron/presenca-querida-reminders`
   - A rota verifica lembretes que precisam de aviso interno **2 dias antes** e envia uma lista por e-mail.

---

## Arquivos alterados/novos

```txt
src/components/ae-solution-header.tsx
src/components/presenca-public-confirmation.tsx
src/app/solucoes/presenca-querida/evento/[slug]/page.tsx
src/app/solucoes/presenca-querida/evento/[slug]/obrigado/page.tsx
src/app/api/presenca-querida/confirmar/[token]/route.ts
src/app/api/cron/presenca-querida-reminders/route.ts
src/lib/presenca-daniela50.ts
src/lib/mail.ts
```

---

## Como aplicar

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Extraia o ZIP na raiz do projeto e substitua os arquivos existentes.

---

## Variáveis de ambiente necessárias

No `.env.local` e também na Vercel, conferir:

```env
EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app-ou-senha-smtp
EMAIL_FROM_NAME=Automação Extrema
EMAIL_FROM=seu-email@gmail.com
EMAIL_COPY_TO=automacao.ao.extremo@gmail.com
CRON_SECRET=uma-chave-grande-aleatoria
NEXT_PUBLIC_SITE_URL=https://www.automacaoextrema.com
```

> Para Gmail, normalmente é necessário usar **senha de app**, não a senha normal da conta.

---

## Validação local

Depois de aplicar:

```powershell
npm install
npm run lint
npx tsc --noEmit
npm run build
```

---

## Testes principais

### 1. Acessar a LP

```txt
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos?convite=TOKEN_REAL
```

Confirme se:

- letras estão menores;
- o card de confirmação mostra status atual quando já houver resposta;
- o convidado consegue alterar resposta.

### 2. Registrar resposta

Ao registrar, deve redirecionar para:

```txt
http://localhost:3000/solucoes/presenca-querida/evento/daniela-50-anos/obrigado?convite=TOKEN_REAL
```

Conferir:

- status de cada convidado;
- texto de obrigado;
- aviso de imprevisto;
- botão para alterar resposta;
- botão do mapa.

### 3. Verificar e-mail interno

Após registrar resposta, verificar se chegou e-mail em:

```txt
automacao.ao.extremo@gmail.com
```

Se não chegar, verificar variáveis SMTP no `.env.local` e nos logs da Vercel.

---

## Testar rota de lembretes manualmente

A rota usa a data atual de São Paulo. Para testar uma data específica, use `date=YYYY-MM-DD`.

Exemplo: para testar o aviso interno que deve sair 2 dias antes do lembrete de 01/11/2026, use 30/10/2026:

```txt
http://localhost:3000/api/cron/presenca-querida-reminders?date=2026-10-30&token=SEU_CRON_SECRET
```

Exemplo para produção:

```txt
https://www.automacaoextrema.com/api/cron/presenca-querida-reminders?date=2026-10-30&token=SEU_CRON_SECRET
```

---

## Programação implementada

### Confirmados

- **12/12/2026**: lembrete com local, horário, mapa e clima da festa
- **18/12/2026**: lembrete final curto

### Talvez

- **05/11/2026**: lembrete gentil
- **12/11/2026**: último lembrete antes do fechamento
- **19/11/2026**: prazo final

### Pendentes

- **01/11/2026**: primeiro lembrete
- **10/11/2026**: segundo lembrete
- **18/11/2026**: aviso de fechamento
- **19/11/2026**: prazo final

A rotina envia e-mail interno **2 dias antes** da data do lembrete, listando os convidados que precisam ser avaliados/acionados.

---

## Configurar cron na Vercel

Opção simples: criar um cron diário para chamar:

```txt
/api/cron/presenca-querida-reminders
```

Sugestão de horário: todo dia às **08:00**.

Na Vercel, configure o header:

```txt
Authorization: Bearer SEU_CRON_SECRET
```

Se usar Vercel Cron via `vercel.json`, pode ser necessário adaptar a configuração do projeto. Como não havia `vercel.json` no pacote enviado, não incluí um arquivo novo para evitar sobrescrever configuração existente.

---

## Deploy

Se estiver usando GitHub conectado à Vercel:

```powershell
git add .
git commit -m "Ajustes obrigado, e-mails e lembretes do Presença Querida"
git push
```

Ou deploy manual:

```powershell
vercel --prod
```
