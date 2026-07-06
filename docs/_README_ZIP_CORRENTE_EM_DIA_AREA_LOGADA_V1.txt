ZIP gerado para ajustes da Ã¡rea logada Corrente em Dia V1.

Objetivo:
1. Ajustar cabeÃ§alho logado:
   - Linha 1: logo + Corrente em Dia + Sair
   - Linha 2: Desenvolvido por AE
   - Linha 3: Cadastro | Contribuintes | Contribuir | AprovaÃ§Ãµes

2. Criar pÃ¡ginas especÃ­ficas:
   - /cliente/cadastro
   - /cliente/contribuintes
   - /cliente/contribuir
   - /cliente/aprovacoes

3. Implementar cadastro da organizaÃ§Ã£o:
   - dados vindos do Quero Conhecer
   - organizaÃ§Ã£o, Pix, contribuiÃ§Ãµes, datas, lembretes, UF, cidade, CEP e endereÃ§o

4. Implementar contribuintes:
   - lista, filtros, inclusÃ£o, upload por planilha, funÃ§Ãµes, login Supabase, e-mail e WhatsApp

5. Implementar contribuir:
   - QR Code Pix, Pix copia e cola, Pix recorrente, upload de comprovante e histÃ³rico

6. Implementar aprovaÃ§Ãµes:
   - aprovaÃ§Ã£o/reprovaÃ§Ã£o/correÃ§Ã£o de comprovantes
   - lembretes por e-mail e WhatsApp com copy Deep Dive sem constrangimento

7. Implementar permissÃµes por funÃ§Ã£o:
   - cadastro.view/edit
   - contribuintes.view/edit/import
   - contribuir.view/upload_receipt
   - aprovacoes.view/review/send_reminders

8. Manter sistema mobile friendly.

Itens excluÃ­dos:
- node_modules
- .next
- .git
- .vercel
- arquivos .env reais
- caches e builds
