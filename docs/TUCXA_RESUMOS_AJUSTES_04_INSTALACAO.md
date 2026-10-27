# TUCXA — Resumos operacionais — Ajustes 04

Base da coleta: `be7093ae4f0975387662e1bb4b17284aab712e29`, branch `fix/tucxa-agendamentos-20261025-v1`.

## Alterações

- `tucxacentro@gmail.com` passa a receber as cópias de auditoria de agendamentos e revisão de perfil do TUCXA. Confirme também no Vercel eventual `OH_ACCESS_REVIEW_EMAIL` e `EMAIL_COPY_TO`; a API de perfil passou a usar o destino específico do TUCXA independentemente dessas configurações gerais.
- Prévia independente da Recepção: cron `0 11 * * 1,2` (08:00 Campinas; Vercel Hobby pode executar durante a hora das 8). Atualização da Recepção e cavalinhos: `0 19 * * 1,2` (16:00 Campinas). O horário dentro da mensagem é de referência, não comprovação de entrega.
- `reception_preview`, `reception` e `cavalinho` são audiências de auditoria independentes. Mesma pessoa pode ter uma mensagem por fase, por dia.
- Listagem de cavalinhos agora considera a escala da entidade, inclusive zero agendamentos, excetuando entidades bloqueadas/suspensas.
- Não há envio em feriados nacionais/SP/Campinas reconhecidos por `isCampinasHoliday` (02/11/2026 incluído). Não há envio em Preview ou Development.
- Telefones normalizados são a chave para buscar e evitar duplicações. Se houver identidade conflituosa (mesmo WhatsApp em duas pessoas ou divergência entre WhatsApp e normalizado), o sistema não envia para esses registros e registra diagnóstico.
- O endereço SMTP de origem não é alterado por esta atualização. Para enviar *a partir* de `tucxacentro@gmail.com`, precisará configurar credenciais SMTP do endereço, não apenas trocar o destinatário.

## Ordem de instalação

1. Faça backup do Supabase de produção, especialmente da tabela `public.oh_tucxa_pilot_daily_dispatches`.
2. Instale este pacote no worktree limpo da branch correta via instalador. **A instalação não publica nada**.
3. Execute `npx eslint ...`, `npx tsc --noEmit` e `npm run build` com Node.js 24 no notebook. Não publique caso haja erro.
4. Execute no SQL Editor do Supabase de produção a migração `supabase/migrations/20261027120000_tucxa_resumos_04_fases_auditoria.sql` **somente depois de revisar a migração e antes de testar novas rotas**. A migração amplia o check de audiência e registra o e-mail auditável de modo separado; os crons antigos continuam compatíveis.
5. Faça commit e push na branch `fix/tucxa-agendamentos-20261025-v1`. Homologue o Preview por leitura (Preflight). Os endpoints de disparo **bloqueiam env diferente de production**.
6. No Preflight `?date=2026-11-02`, confirme `holiday=true`, com elegibilidade de envio falsa; NÃO use rotas que enviam para verificar feriados.
7. Confirme no Preflight uma segunda ou terça sem feriado, com funções/escala/WhatsApps corretos. Confirme que Valéria, Aline e Bea estão ativas pela chave telefônica. Não altere cadastros a partir de nomes.
8. Abra Pull Request para `main`, faça merge após checks e homologação, confira em Vercel Production os novos crons, variáveis, BotConversa e logs.
9. Homologue os dois horários **em produção com observação**, sem disparos manuais para pessoas reais. Um teste com envio real precisa de autorização explícita e destinatários de teste.

## Limites operacionais

- O Vercel Hobby executa cada cron no intervalo de até 59 minutos após o horário declarado, não exatamente no minuto 00. O cron não é disparado em Preview.
- Se `pilotReceptionDailyWhatsappEnabled` ou `pilotCavalinhoDailyWhatsappEnabled` estiver desligado, a fase correspondente não enviará.
- Para o envio, o BotConversa precisa ter os fluxos existentes `BOTCONVERSA_TUCXA_RECEPTION_DAILY_FLOW_ID` e `BOTCONVERSA_TUCXA_CAVALINHO_DAILY_FLOW_ID` configurados e mostrar o campo de resumo nas mensagens. A mesma automação de Recepção é usada para a prévia e a atualização; teste se ela não contém título estático conflitante.
- Para 02/11/2026, Finados, `isCampinasHoliday` já retorna `true`; sem envios para ninguém.
- A nova migração não cria nem altera cadastros de Valéria e Aline. Confirme os números canônicos antes de qualquer correção cadastral.
- O sistema grava status SMTP por fase. Um reprocessamento autorizável no mesmo período tenta novamente e-mail que falhou, sem reenviar WhatsApp com status `sent`. Não substitui um sistema de fila transacional robusta para concorrência simultânea.

## Diagnóstico de referências legadas de e-mail

No worktree execute, sem alterar código:

```powershell
git grep -n -F "automacao.ao.extremo@gmail.com" -- "src/app/api/organizacao-em-harmonia" "src/app/api/cron/tucxa-*" "src/lib/organizacao-em-harmonia"
```

Revise os resultados para detectar outros fluxos não abrangidos na coleta, principalmente configurações dinâmicas do Supabase e templates no BotConversa.
