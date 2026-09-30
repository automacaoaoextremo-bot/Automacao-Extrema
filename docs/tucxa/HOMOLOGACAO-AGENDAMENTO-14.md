# Homologação — TUCXA Agendamento 14

## 1. BotConversa
1. Crie um novo agendamento para um WhatsApp de teste.
2. Confirme que a mensagem automática mostra a data.
3. Verifique no cartão do contato se `TUCXA - Data atendim` foi atualizado.
4. Se o BotConversa rejeitar algum campo, o fluxo não deve ser disparado com dados incompletos.

## 2. Página pública
No celular, confirme que `Por que usar` e `Horários` usam o mesmo tamanho visual de fonte de `Agendamento` e `Ajuda`.

## 3. Recepção — Sair/Ajuda
No celular, confirme que os botões ficam compactos, sem as áreas laterais vazias mostradas no documento.

## 4. Acolhimento
Confirme que a data aparece inteira, por exemplo `segunda-28/09/2026`, e que o seletor `Entidade` ocupa menos largura.

## 5. Configurações
- E-mail e WhatsApp permanecem como canais independentes.
- Há o título `Ordenação`.
- As opções são apenas `Entidade` e `Dia`.
- `Ambos` não aparece.

## 6. Cadastros → Consulentes
Confirme a busca por nome/WhatsApp e também o seletor alfabético A, B, C...
Ao abrir uma letra, confirme Nome, WhatsApp e, quando existir, Entidade padrão.

## 7. Disponibilidade das Entidades
Confirme cards mais compactos e paginação.

## 8. Cadastros → Entidades
O título deve aparecer como `Cadastros · Entidades`, sem a linha adicional `Entidades`.

## 9. Agendar Consulente
- O título é `Agendar Consulente`.
- Para pessoa com Entidade padrão e sem permissão para trocar, a Entidade é aplicada automaticamente.
- Se a Entidade padrão não atende/não tem vaga na data, a pessoa não pode ser selecionada e aparece popup explicativo.
- A API deve repetir a validação e impedir burla pelo front-end.

## 10. SQL Paulo Machado
Execute primeiro apenas a consulta de conferência do arquivo SQL. Só execute o bloco `DO` se houver exatamente um resultado correto.

## 11. Cadastro pessoal
Abra `Cadastros → Cadastro pessoal`. Ao tocar em `Voltar`, o sistema deve retornar à tela da Recepção/Cadastros que originou a navegação, não ao painel genérico.
