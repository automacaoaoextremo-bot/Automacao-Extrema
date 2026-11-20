# Reparos RMC — Fluxo do piloto assistido N1 → N2

**Objetivo:** tirar a coleta inicial e as conversas repetitivas da rotina do Anderson, sem alterar o número atual do WhatsApp Business nesta fase.

```text
Cliente no WhatsApp RMC existente
           |
           v
N1 AE (com autorização do Anderson e do cliente)
- identifica serviço, bairro, celular, problema
- pede fotos/vídeo se necessário
- registra pedido assistido no formulário RMC
           |
           v
Fila privada RMC / Anderson N2
- analisa detalhes e mídias
- solicita complemento se necessário
- prepara minuta com valores e validade
- escolhe 2 ou 3 datas possíveis (a confirmar)
           |
           v
Anderson abre mensagem pré-preenchida no WhatsApp Business
- confere cliente e condições
- clica Enviar no WhatsApp
- confirma manualmente que enviou no painel
           |
           v
Cliente informa aceite / recusa e a data preferida
- Anderson registra no painel
- confirma horário da visita separadamente
           |
           v
Execução do serviço e avaliação para futuras evoluções
```

**Lembrete de validade:** 24 horas antes do vencimento, um aviso aparece no painel do N2. O Anderson pode abrir uma mensagem pronta e enviá-la manualmente. Não existe envio automático nesta versão.

**Cliente autenticado:** ainda não disponível. N1 cadastra contato e solicitação com autorização, nunca cria senha igual para todos. O login próprio do cliente virá com validação de identidade em fase posterior.

**Indicadores dos primeiros 5–10 atendimentos:** quantidade de perguntas repetidas, pedidos incompletos, tempo do N1, tempo até orçamento N2, orçamentos aceitos/recusados, solicitações que exigiram complementação.

**Futuras evoluções:** conexão oficial Meta Cloud API depois da homologação, lembrete automático autorizado, aceite digital do cliente, calendário, OS e laudos.
