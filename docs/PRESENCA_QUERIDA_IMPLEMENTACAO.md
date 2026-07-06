# Presença Querida — implementação dentro da AE

## Objetivo

Criar o Presença Querida como solução própria da Automação Extrema, seguindo a mesma estratégia comercial do Corrente em Dia:

- landing pública;
- formulário `Quero Conhecer`;
- lead de Cliente Fundador;
- login do cliente;
- área logada inicial;
- painel com checklist;
- lookup para BotConversa;
- tabelas próprias no Supabase com prefixo `pq_`.

## Rotas criadas

### Públicas

- `/solucoes/presenca-querida`
- `/solucoes/presenca-querida/quero-conhecer`
- `/solucoes/presenca-querida/obrigado`
- `/solucoes/presenca-querida/login`

### Área do cliente

- `/solucoes/presenca-querida/cliente`
- `/solucoes/presenca-querida/cliente/primeiros-passos`
- `/solucoes/presenca-querida/cliente/cadastro`
- `/solucoes/presenca-querida/cliente/convidados`
- `/solucoes/presenca-querida/cliente/mensagens`
- `/solucoes/presenca-querida/cliente/confirmacoes`
- `/solucoes/presenca-querida/cliente/relatorios`

### APIs

- `POST /api/presenca-querida/leads`
- `GET /api/presenca-querida/leads/lookup`
- `POST /api/presenca-querida/leads/lookup`
- `GET /api/presenca-querida/cliente/dashboard`
- `GET /api/presenca-querida/cliente/onboarding`

## Banco de dados

Rodar no Supabase SQL Editor:

```sql
supabase/sql/20260620_07_presenca_querida_cliente_fundador.sql
```

O script cria:

- `pq_events`
- `pq_people`
- `pq_roles`
- `pq_person_events`
- `pq_guests`
- `pq_guest_messages`
- `pq_client_terms`
- `pq_leads`
- `pq_v_dashboard_events`

Também cria um demo inicial:

- evento: `Daniela 50 anos`
- slug: `daniela-50-anos-demo`
- convidados fictícios;
- mensagens-base por fase;
- termo de Cliente Fundador demo.

## BotConversa

Para o BotConversa, use o endpoint:

```txt
POST https://SEU_DOMINIO/api/presenca-querida/leads/lookup
```

Body sugerido:

```json
{
  "whatsapp": "{telefone}",
  "email": "{email}",
  "leadId": "{pq_lead_id}",
  "message": "{mensagem}",
  "source": "botconversa_pq_site"
}
```

Campos úteis no retorno:

- `found`
- `leadId`
- `responsibleName`
- `eventName`
- `email`
- `whatsapp`
- `statusLabel`
- `loginUrl`
- `leadFormUrl`
- `botconversaMessage`
- `botconversaReply`

Use `botconversaMessage` ou `botconversaReply` como resposta automática.

## Estratégia Cliente Fundador

A estratégia validada para o Presença Querida é:

1. liberar acesso inicial;
2. configurar evento real;
3. cadastrar grupo piloto de convidados;
4. testar link individual;
5. medir taxa de resposta e pendências;
6. colher feedback;
7. solicitar depoimento e autorização de prints apenas se aprovado pelo cliente.

## Próximas evoluções recomendadas

- Criar edição real dos campos de `pq_events` na tela Cadastro.
- Criar CRUD real de convidados em `pq_guests`.
- Adicionar importação CSV/XLSX de convidados.
- Criar página pública de confirmação por token individual.
- Criar exportações CSV/PDF para buffet, recepção, lembrancinhas e etiquetas.
- Criar painel admin/funil específico do Presença Querida.
- Adicionar envio de e-mail de acesso e sincronização ativa com BotConversa, seguindo a implementação completa do Corrente em Dia.
