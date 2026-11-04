# AE Atendimento Inteligente — V1 piloto

Entrega inicial para **Reparos RMC** e **Piloto Elétrica e Baterias**, por Automação Extrema.

## O que está incluído

- Banco de dados Supabase **multiempresa**, com RLS e sem acesso direto por `anon`/`authenticated`.
- Na V1, **um numero ativo por empresa**, mas varias empresas/numeros na plataforma.
- Contatos distintos por empresa; celular normalizado em dígitos, **único dentro da empresa**.
- Webhook oficial Meta Cloud API (`GET` para verificação; `POST` com HMAC SHA256 validado).
- Processamento idempotente usando ID externo da mensagem e transação PostgreSQL.
- Fluxo de triagem configurado por **segmento** (reparos ou automotivo); coleta categoria, descrição, região e urgência.
- Encaminhamento para **atendente humano** e recusa de compromisso automático de preço/horário.
- Painel autenticado por usuário e verificação de associação com empresa.
- Outbox com estados: `pending`, `sending`, `sent`, `simulated`, `failed`, `unknown`.
- **Envio real bloqueado por padrão**, inclusive em Preview, mesmo com token Meta configurado.

## O que NÃO está incluído nesta V1

- Integração com Chatwoot/n8n (extensões futuras); Google Agenda; orçamentos; laudos; NFS-e.
- Histórico completo de conversas anteriores à conexão da Cloud API.
- Download/visualização de fotos e áudios: o webhook guarda **apenas os IDs Meta de anexos**.
- Envio de templates aprovados fora da janela de 24 horas.
- Reenvio automático de mensagens com entrega incerta ou sem resposta da Meta.
- Embedded Signup/Tech Provider automático, nem provisionamento autônomo de WABA.
- SLA de tempo de resposta ou garantia de 24h sem monitoramento e suporte.

## URLs

- Administração AE: `/admin/ae/atendimento-inteligente`
- Painel do cliente: `/solucoes/atendimento-inteligente/painel`
- Webhook Meta: `/api/webhooks/meta-whatsapp`
- API de dados: `/api/atendimento-inteligente/organizations`, `/conversations`, `/conversations/[id]`, `/send`

## Cuidados de produção

- Não reutilizar o número de agendamentos do TUCXA; não alterar `/api/whatsapp/route.ts`, pois esta rota é somente redirecionamento de site.
- Para cada empresa, conectar **sua própria WABA/número** com autorização formal, sem dividir credenciais entre clientes.
- Meta Business App pode não permitir coexistência em toda conta. Confirmar elegibilidade ANTES de vincular o número de Anderson.
- Um mesmo Meta App Secret (`AE_META_APP_SECRET`) autentica webhooks das WABAs integradas ao aplicativo. Tokens de cada canal ficam em variáveis de ambiente **exclusivas do servidor** (`AE_WA_TOKEN_RMC`, `AE_WA_TOKEN_PILOTO`).
- O bot só recebe/enfileira resposta se `status='active'`, `automation_enabled=true` e `channel.active=true`.
- Bot desativado significa registro de mensagens, mas nenhuma resposta automática.
- **Bloqueio de envios reais**: requer Vercel em `production` e `AE_AI_SEND_LIVE=true`. Em Preview/local o status fica `simulated`, sem disparo externo.
- A Cloud API exige respostas dentro da janela de atendimento e templates quando aplicável; no piloto, mensagens manuais sem template são bloqueadas após 23 horas por margem de segurança.
- Ativar backups, observabilidade, retenção/anonimização e rotina operacional LGPD antes de escalar para clientes externos.

Leia o roteiro completo em `PASSO_A_PASSO_INSTALAR_HOMOLOGAR_PRODUCAO.md`.
