# TUCXA — Homologação do Piloto de Agendamentos V1

## Escopo

Piloto de atendimento de Filhos de Fora/Consulentes com foco em:

- agendamento pela Recepção;
- autoagendamento do Filho de Fora/Consulente;
- calendário de Entidades por segunda/terça e ocorrência do mês;
- capacidade máxima por Entidade/dia;
- suspensão de uma Entidade por data ou período;
- confirmação pelo painel ou por link recebido por SMS;
- confirmação até o horário configurado (inicialmente 16:00 do dia do atendimento);
- telas compactas, com detalhes em janelas/pop-ups.

## 1. Aplicar a migration

Execute no Supabase a migration:

`supabase/migrations/20260923110000_oh_tucxa_agendamentos_piloto_v1.sql`

Confirme a criação das tabelas:

- `oh_tucxa_pilot_entity_schedule`
- `oh_tucxa_pilot_entity_overrides`

E as novas colunas de confirmação em `oh_consulente_appointments`.

## 2. Conferir o calendário inicial

Para 28/09/2026 (segunda-feira, 4ª segunda do mês), a Recepção deve visualizar:

- Ubirajara
- Aruando
- Raio de Luz
- Frei Francisco
- Aymore
- Raio de Sol
- Madre Antonieta
- Flor de Lotus
- Flexa da Mata
- Lança Dourada
- Sol Azul
- Tia Margarida
- Guerreiro
- Dr. Alexandre
- Passes
- Primeira Vez

`Luar da Mata` e `Dra. Sandra` pertencem ao calendário da 1ª/3ª segunda e não devem aparecer em 28/09/2026.

## 3. Recepção — agendamento

Acesse como um Filho da Corrente com função Recepção.

Caminho esperado:

`/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento`

A tela deve abrir a experiência simplificada do piloto.

Teste:

1. toque em **Agendar**;
2. escolha 28/09/2026;
3. escolha uma Entidade com vaga;
4. pesquise um WhatsApp já cadastrado;
5. confirme o agendamento;
6. verifique a ordem atribuída;
7. verifique o link de confirmação;
8. se SMS estiver configurado, confira o envio.

## 4. Cadastro novo pela Recepção

Na tela de agendamento:

1. pesquise um número ainda não cadastrado;
2. informe nome completo;
3. informe e-mail, se houver;
4. defina senha temporária com no mínimo 8 caracteres;
5. marque a ciência do Aviso de Privacidade;
6. crie o cadastro;
7. faça o agendamento;
8. valide o login do novo Filho de Fora/Consulente.

## 5. Confirmação por link

Abra o link retornado após o agendamento.

Teste as duas opções em agendamentos distintos:

- **Confirmar minha presença** → status `confirmado` e `confirmation_status=confirmed`;
- **Não poderei comparecer** → status `cancelado`, `confirmation_status=declined` e vaga liberada.

## 6. Prazo de confirmação

A configuração inicial é 16:00 do dia do atendimento.

Depois do prazo, um agendamento ainda pendente deve:

- ser marcado como expirado;
- ser cancelado automaticamente quando o piloto for consultado, liberando a vaga;
- não permitir confirmação automática pelo link;
- orientar contato com a Recepção, que poderá fazer um novo agendamento ou confirmar manualmente quando couber.

## 7. Gestão de Entidades

Na Recepção, abra **Entidades**.

Teste:

1. suspenda uma Entidade somente em 28/09/2026;
2. confirme que ela aparece como suspensa e não pode ser agendada;
3. crie uma nova atualização marcando-a disponível;
4. defina capacidade 1;
5. faça um agendamento;
6. confirme que a Entidade fica sem vagas;
7. configure uma suspensão por período de duas datas e confirme o efeito nas datas abrangidas.

## 8. Filho de Fora/Consulente

Acesse:

`/solucoes/organizacao-em-harmonia/tucxa/consulente/painel/atendimento`

A página deve destacar somente o fluxo simples do piloto:

- Agendar atendimento;
- Consultar e confirmar;
- Orientações;
- Agenda Viva.

No agendamento:

1. escolha uma data;
2. confirme que aparecem somente as Entidades previstas naquela ocorrência do mês;
3. escolha uma Entidade com vaga;
4. reserve;
5. abra **Consultar e confirmar**;
6. confirme a presença;
7. em outro teste, use **Não poderei ir** e confira a liberação da vaga.

## 9. SMS — configuração opcional

### Twilio

No Vercel configure:

- `TUCXA_SMS_PROVIDER=twilio`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_SMS_FROM`

### Webhook próprio/terceiro

- `TUCXA_SMS_PROVIDER=webhook`
- `TUCXA_SMS_WEBHOOK_URL`
- `TUCXA_SMS_WEBHOOK_TOKEN` (opcional)

Sem provedor:

- `TUCXA_SMS_PROVIDER=disabled`

O agendamento continua funcionando e a Recepção recebe o link para copiar e enviar por outro canal.

## 10. Validações técnicas

Antes do push:

```powershell
npm run lint
npm run build
git diff --check
```

Não faça merge em `main` antes da homologação do Preview da branch.
