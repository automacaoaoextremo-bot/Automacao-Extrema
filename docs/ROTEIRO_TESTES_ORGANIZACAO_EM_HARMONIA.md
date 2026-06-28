# Roteiro de testes — Organização em Harmonia

## 1. Páginas públicas

Testar:

```txt
/solucoes/organizacao-em-harmonia
/solucoes/atendimento-em-harmonia
/solucoes/agenda-viva
/solucoes/organizacao-em-harmonia/quero-conhecer
/solucoes/organizacao-em-harmonia/obrigado
```

Critérios:

- Cabeçalho igual ao padrão do Corrente em Dia.
- Logo da solução no topo.
- Linha Desenvolvido por Automação Extrema.
- Layout mobile-friendly.
- Botão Quero Conhecer funcionando.
- Botão WhatsApp apontando para o WhatsApp da AE, não para o telefone do lead.

## 2. Formulário Quero Conhecer

Campos mínimos obrigatórios:

```txt
Nome do contato
WhatsApp
E-mail
```

Campos opcionais:

```txt
Módulo de interesse
Nome da organização
LGPD
Cliente Fundador
```

Critérios:

- Não envia sem nome, WhatsApp e e-mail.
- LGPD e Cliente Fundador não bloqueiam envio.
- Ao enviar, redireciona para Obrigado.
- Campos são limpos antes do redirecionamento.

## 3. Supabase

Após envio, conferir:

```sql
select *
from public.oh_leads
order by created_at desc
limit 10;
```

Critérios:

- Lead criado.
- `interest_module` correto.
- `contact_name`, `email`, `whatsapp` corretos.
- `status` muda para `email_confirmacao_enviado` se e-mail foi enviado.

## 4. E-mail

Critérios:

- E-mail chega ao lead.
- E-mail cita módulo de interesse.
- Orienta continuar pelo WhatsApp.
- Cita spam/lixo eletrônico.
- E-mail interno chega para AE.

## 5. BotConversa

Critérios:

- Contato criado/atualizado.
- Etiquetas aplicadas.
- Campos `oh_*` preenchidos.
- Campo `oh_resp_botconversa` preenchido se ID estiver configurado.
- Fluxo responde com mensagem fixa ou variável.

## 6. Lookup

PowerShell:

```powershell
$body = @{
  source = "debug"
  whatsapp = "19992360856"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://www.automacaoextrema.com/api/organizacao-em-harmonia/leads/lookup" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Critérios:

- Retorna `ok=true`.
- Se encontrar, `found=true`.
- Mensagem cita spam/lixo eletrônico.
- Fallback não manda preencher novamente o formulário.

## 7. Próximo ciclo funcional

Depois de validar entrada e BotConversa, iniciar MVP logado:

- Configurações: módulos ativos, funções e permissões.
- Agenda Viva: criar atividade, aprovar, detectar conflito.
- Atendimento em Harmonia: criar dia de atendimento, check-in, fila, status e retorno.
- Corrente em Dia: manter funcionando com base atual e planejar integração gradual com `oh_people`.
