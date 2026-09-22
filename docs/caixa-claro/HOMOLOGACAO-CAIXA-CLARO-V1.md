# Caixa Claro — Homologação SilvaMattano V1

## Pré-requisitos

- Migration `20260922110000_caixa_claro_silvamattano_v1.sql` aplicada no Supabase.
- Quatro usuários criados em Authentication > Users.
- Usuários vinculados com `vincular-usuarios-silvamattano.sql`.
- Variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já configuradas no ambiente do projeto.

## Roteiro

1. Acesse `/solucoes/caixa-claro` e confirme a landing page e o novo logo.
2. Entre em `/solucoes/caixa-claro/login` com cada um dos quatro usuários e confirme que o nome correto aparece no cabeçalho.
3. No painel mobile, confirme que a tela principal permanece sem rolagem; detalhes devem abrir em modais com rolagem própria.
4. Em **Movimentos**, importe o XLSX do BTG de 01/01/2026 a 21/09/2026. Verifique se linhas `Saldo Diário` não aparecem como transações e se o último saldo atualiza `BTG Família`.
5. Reimporte o mesmo XLSX. Os lançamentos não devem duplicar, pois o sistema usa hash por conta/lançamento.
6. Em **Rendas**, cadastre um holerite ou INSS como renda prevista/recebida.
7. Em **Documentos**, envie o PDF/holerite correspondente e confirme que o arquivo entra no bucket privado `caixa-claro-private`.
8. Em **Conciliação**, ligue a renda a um `Pix recebido` do BTG usando **PIX ponte**. O PIX deve permanecer como `transfer` e não deve, sozinho, alterar o valor recebido da renda. Confirme a renda manualmente em **Rendas** ou pelo crédito do banco de origem.
9. Teste um caso parcial: registre uma renda e concilie em dois PIX diferentes. A soma das alocações deve completar o valor recebido.
10. Cadastre em **Movimentos** o banco em que um salário é depositado. Essa conta poderá ser usada futuramente para importar o extrato do banco de origem e conciliar o crédito direto antes do PIX ao BTG.
11. Em **Agenda**, cadastre uma despesa para os próximos 30 dias e confirme alteração da projeção do caixa.
12. Em **Meu acesso**, altere a senha de um usuário e confirme novo login.
13. Tente acessar com um usuário Supabase não vinculado à família. O painel deve bloquear e informar que o vínculo ainda não existe.
