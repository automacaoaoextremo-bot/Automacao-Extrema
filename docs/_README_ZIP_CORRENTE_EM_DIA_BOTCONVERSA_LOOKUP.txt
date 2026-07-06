ZIP gerado para ajustes do BotConversa Corrente em Dia.

Objetivo:
1. Corrigir botÃ£o da pÃ¡gina Obrigado para enviar sempre ao WhatsApp da AE: 5519989848246.
2. Manter WhatsApp do lead apenas dentro da mensagem.
3. Ajustar endpoint /api/corrente-em-dia/leads/lookup para localizar por WhatsApp e/ou leadId.
4. Retornar botconversaMessage pronto para evitar variÃ¡veis quebradas no BotConversa.
5. Atualizar documentaÃ§Ã£o do fluxo BotConversa:
   - palavra-chave com condiÃ§Ã£o ContÃ©m
   - integraÃ§Ã£o com URL https
   - nÃ£o conectar saÃ­da Continuar sem esperar resposta
   - mapear botconversaMessage
   - enviar URL de login sem senha
6. Manter senha fora do WhatsApp.
